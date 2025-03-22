#!/usr/bin/env zx

import {
  $,
  argv,
  chalk,
  path,
} from 'zx';
import '../framework/server/core/initEnv.cjs';

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('run-server-script: env vars not set.');
}

process.env.FORCE_COLOR = '3';
$.verbose = true;

const scriptName = argv._[0].endsWith('scripts/run-server-script.mjs')
  ? argv._[1]
  : argv._[0];
if (!scriptName) {
  throw new Error(`run-server-script: missing script name: ${argv._.join(' ')}`);
}

await $`scripts/build-server-script.sh ${scriptName}`;

const buildPath = `build/${process.env.NODE_ENV}/server-script/${scriptName}.js`;
console.log(chalk.green(`Built ${buildPath}`));

const runInDocker = argv.docker ?? process.env.SERVER === 'production';
if (runInDocker) {
  await $`yarn dc start server-script`.quiet();
  await $`yarn dc exec -u 0 server-script sh -c "mkdir -p ${path.dirname(buildPath)}"`.quiet();
  await $`yarn dc cp ${buildPath} server-script:/usr/src/${buildPath}`.quiet();
  await $({ stdio: ['inherit', 'pipe', 'pipe'] })`
    yarn dc exec -it -u 0 server-script \\
    node --experimental-specifier-resolution=node --no-warnings \\
    /usr/src/${buildPath} ${process.argv.slice(4)}
  `;
} else {
  await $({ stdio: ['inherit', 'pipe', 'pipe'] })`
    node --experimental-specifier-resolution=node --no-warnings \\
    ${buildPath} ${process.argv.slice(4)}
  `;
}
