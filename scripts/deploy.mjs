#!/usr/bin/env zx

import { $, argv, question } from 'zx';

require('../framework/server/core/initEnv.cjs');

$.verbose = true;

// Version from git
const version = (await $`git rev-list --count master`).stdout.trim();

// Active hours check
const utcHour = new Date().getUTCHours();
if (utcHour < 5 || utcHour >= 10) {
  const reply = await question('Deploy during active hours? (prefer 9pm-3am PT, 12am-6am ET) (y/n) ');
  if (!/^[Yy]$/.test(reply.trim())) {
    process.exit(1);
  }
}

// Ensure clean repo
if ((await $`git status --porcelain`).stdout.trim()) {
  throw new Error('Commit changes before deploying');
}
if ((await $`git log --oneline origin/master..HEAD`).stdout.trim()) {
  throw new Error('Push commits before deploying');
}

// Start ssh-agent
await $`ssh-agent -t 600`;
await $`ssh-add`;

// Run pre-deploy
await $`npx zx ./scripts/pre-deploy.mjs ${argv._}`;

// Keep old files
await $`mkdir -p build/production/web/js build/production/web/css`;
await $`find build/production/web/js -mindepth 1 -mtime +7 -delete`;
await $`find build/production/web/css -mindepth 1 -mtime +7 -delete`;
await $`rm -rf build/tmp/*`;
await $`mkdir -p build/tmp`;
await $`cp -r build/production/web/js build/tmp/js || true`;
await $`cp -r build/production/web/css build/tmp/css || true`;
await $`rm -rf build/production/*`;
await $`mkdir -p build/production/web`;
await $`cp -r build/tmp/js build/production/web/js || true`;
await $`cp -r build/tmp/css build/production/web/css || true`;
await $`rm -rf build/tmp`;

// Build JS
console.log('Build JS');
await $`BUILD_SERVER=production scripts/build.sh`;
if ((await $`git status --porcelain`).stdout.trim()) {
  throw new Error('Got changes from build');
}
await $`NODE_ENV=production SERVER=production scripts/build-server-script.sh monitorInfra`;

// Upload source maps
await $`sentry-cli sourcemaps inject build/production/server --silent`;
await $`sentry-cli sourcemaps inject build/production/web/js --silent`;
await $`sentry-cli sourcemaps upload build/production/server --project server --release ${version} --silent`;
await $`sentry-cli sourcemaps upload build/production/web/js --project web --release ${version} --silent`;
await $`find build/production -name "*.js.map" -type f -delete`;

// Build docker
console.log('Build Docker');
await $`scripts/build-docker-package-json.mjs`;
await $`docker build --platform linux/amd64 -t server -f framework/infra/server-dockerfile .`;
await $`docker save server | gzip > server.tar.gz`;

// Upload tar
await $`scp server.tar.gz root@${process.env.PROD_IP}:${process.env.PROD_ROOT_DIR}`;

// Post-deploy
await $`ssh -tt root@${process.env.PROD_IP} "source ~/.profile; cd ${process.env.PROD_ROOT_DIR}; git fetch origin; git reset --hard origin/master; scripts/post-deploy.sh ${version}"`;

// Purge Cloudflare cache
await $`curl -s -S --output /dev/null \
  -X POST "https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/purge_cache" \
  -H "X-Auth-Email: ${process.env.CF_USERNAME}" \
  -H "X-Auth-Key: ${process.env.CF_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'`;
console.log('Purged Cloudflare cache');

// Cleanup
await $`rm server.tar.gz`;
