#!/usr/bin/env zx

import {
  $,
  argv,
  chalk,
  path,
} from 'zx';

process.env.FORCE_COLOR = '3';

const scriptName = argv._[0];
if (!scriptName) {
  throw new Error('Missing script name');
}

await $`scripts/build-server-script.sh ${scriptName}`;

const buildPath = `build/${process.env.NODE_ENV}/server-script/${scriptName}.js`;
console.log(chalk.green(`Built ${buildPath}`));

const runInDocker = argv.docker ?? process.env.SERVER === 'production';
if (runInDocker) {
  await $`docker start server-script`.quiet();
  await $`docker exec -u 0 server-script sh -c "mkdir -p ${path.dirname(buildPath)}"`.quiet();
  await $`yarn dc cp ${buildPath} server-script:/usr/src/${buildPath}`.quiet();
  await $`
    docker exec -it -u 0 server-script \\
    node --experimental-specifier-resolution=node --no-warnings /usr/src/${buildPath} ${process.argv.slice(4)}
  `;
} else {
  await $`
    node --experimental-specifier-resolution=node --no-warnings \\
    ${buildPath} ${process.argv.slice(4)}
  `;
}
