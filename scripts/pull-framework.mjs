#!/usr/bin/env zx

import { $, argv } from 'zx';

require('../framework/server/core/initEnv.cjs');

$.verbose = true;

if ((await $`git status --porcelain`).stdout) {
  console.log('App has uncommitted changes');
  process.exit(1);
}

await $`git --git-dir=.git-framework co master`;

await $`./scripts/helpers/switch-to-framework.sh`;

await $`git --git-dir=.git-framework checkout origin/master -- yarn.lock`;
if (!argv['skip-uncommitted']
  && (await $`git --git-dir=.git-framework status --porcelain`).stdout) {
  console.log('Framework has uncommitted changes');
  await $`./scripts/helpers/switch-to-app.sh`;
  process.exit(1);
}

await $`git --git-dir=.git-framework fetch origin master`;
await $`git --git-dir=.git-framework checkout origin/master -- .`;
await $`git --git-dir=.git-framework add -A`;
await $`git --git-dir=.git-framework commit -m 'Pull framework'`;

// git --git-dir=.git-framework rebase -X theirs origin/master
// if [ $? -ne 0 ]; then
//   echo "Conflicts in framework, run \"git --git-dir=.git-framework status\" to view"
// fi

await $`./scripts/helpers/switch-to-app.sh`;

await $`yarn`;

await $`git add -A`;
await $`git commit -m 'Pull framework'`;
