#!/usr/bin/env zx

import { $, argv } from 'zx';

require('../framework/server/core/initEnv.cjs');

const gitStatus = await $`git status --porcelain`;
if (gitStatus.stdout) {
  console.log('Commit changes before deploying');
  process.exit(1);
}

const gitLog = await $`git log --oneline origin/master..HEAD`;
if (gitLog.stdout) {
  console.log('Push commits before deploying');
  process.exit(1);
}

await $`yarn build:types`;
await $`yarn pgdump`;

if (argv.verify !== false) {
  await Promise.all([
    $`yarn lint`,
    $`yarn tsc`,
    // $`yarn test`,
  ]);
}
