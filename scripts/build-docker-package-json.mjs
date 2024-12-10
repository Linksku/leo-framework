#!/usr/bin/env zx

import { fs } from 'zx';

import webpackConfig from '../webpack.server.js';

const [packageJson, appPackageJson, dockerPackageJson] = await Promise.all([
  fs.readJson('./package.json'),
  fs.readJson('./app/package.json'),
  fs.readJson('./package.docker.json'),
]);

const packages = Object.keys(webpackConfig.externals[0])
  .concat(['dotenv', 'patch-package'])
  .sort();
const missingExternal = Object.keys(dockerPackageJson.dependencies)
  .find(pkg => !packages.includes(pkg));
if (missingExternal) {
  throw new Error(`External "${missingExternal}" not in webpack.server.js`);
}

dockerPackageJson.dependencies = {};
for (const pkg of packages) {
  if (!packageJson.dependencies[pkg] && !appPackageJson.dependencies[pkg]) {
    throw new Error(`External "${pkg}" not in package.json`);
  }

  dockerPackageJson.dependencies[pkg]
    = appPackageJson.dependencies[pkg] ?? packageJson.dependencies[pkg];
}

await fs.writeJson('./package.docker.json', dockerPackageJson, { spaces: 2 });
