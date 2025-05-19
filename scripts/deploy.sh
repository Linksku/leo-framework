#!/bin/bash
# Exit if anything fails
set -e
source <(grep -v '^#' env/secrets)

version=$(git rev-list --count master 2>/dev/null || echo 0)

utcHour=`date +"%-H" --utc`
# 5 UTC = 9 PST, 10 UTC = 6 EDT
if [[ "$utcHour" -lt 5 || "$utcHour" -ge 10 ]]; then
  read -n 1 -p "Deploy during active hours? (prefer 9pm-3am PT, 12am-6am ET) (y/n) " -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

if [[ -n $(git status --porcelain) ]]; then
  echo "Commit changes before deploying"
  exit 1
fi

if [[ -n $(git log --oneline origin/master..HEAD) ]]; then
  echo "Push commits before deploying"
  exit 1
fi

eval `ssh-agent -t 600`
ssh-add

npx zx ./scripts/pre-deploy.mjs "$@"

# Keep older files in case clients are open during deploy
mkdir -p build/production/web/js
mkdir -p build/production/web/css
find build/production/web/js -mindepth 1 -mtime +7 -delete
find build/production/web/css -mindepth 1 -mtime +7 -delete
rm -rf build/tmp/*
mkdir -p build/tmp
cp -r build/production/web/js build/tmp/js
cp -r build/production/web/css build/tmp/css
rm -rf build/production/*
mkdir -p build/production/web
cp -r build/tmp/js build/production/web/js
cp -r build/tmp/css build/production/web/css
rm -rf build/tmp

echo "Build JS"
BUILD_SERVER=production scripts/build.sh
if [[ -n $(git status --porcelain) ]]; then
  echo "Got changes from build"
  exit 1
fi
NODE_ENV=production SERVER=production scripts/build-server-script.sh monitorInfra

echo "Upload source maps"
sentry-cli sourcemaps inject build/production/server --silent
sentry-cli sourcemaps inject build/production/web/js --silent
sentry-cli sourcemaps upload build/production/server --project server --release $version --silent
sentry-cli sourcemaps upload build/production/web/js --project web --release $version --silent
find build/production -name "*.js.map" -type f -delete

# todo: low/mid option to deploy only client code
echo "Build Docker"
scripts/build-docker-package-json.mjs
docker build -t server -f framework/infra/server-dockerfile .
docker save server | gzip > server.tar.gz

echo "Upload tar"
scp server.tar.gz "root@$PROD_IP:$PROD_ROOT_DIR"

echo "Run post-deploy"
GIT_REVS=$(git rev-list --count master 2>/dev/null || echo 0)
ssh -tt "root@$PROD_IP" "source ~/.profile; cd $PROD_ROOT_DIR; git fetch origin; git reset --hard origin/master; scripts/post-deploy.sh $GIT_REVS"

curl -s -S --output /dev/null \
  -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "X-Auth-Email: $CF_USERNAME" \
  -H "X-Auth-Key: $CF_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}' \
  && echo 'Purged Cloudflare cache'

rm server.tar.gz
