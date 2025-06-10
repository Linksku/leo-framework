#!/usr/bin/env zx

import { $, argv } from 'zx';

if ((await $`git status --porcelain`).stdout) {
  console.log('Commit changes before pushing');
  process.exit(1);
}

await $`git fetch origin master`;
await $`git --git-dir=.git-framework checkout master`;
if ((await $`git --git-dir=.git-framework diff master origin/master`).stdout) {
  console.log('Pull before pushing: git --git-dir=.git-framework fetch origin master && git --git-dir=.git-framework rebase origin/master');
  process.exit(1);
}

await $`./scripts/helpers/switch-to-framework.mjs`;

try {
  if ((await $`git --git-dir=.git-framework ls-files -i -c --exclude-from=.gitignore`).stdout) {
    await $`git --git-dir=.git-framework rm --cached \`git --git-dir=.git-framework ls-files -i -c --exclude-from=.gitignore\``;
  }
  await $`git --git-dir=.git-framework add -A`;
  await $`git --git-dir=.git-framework commit -m 'Squashed commits'`;

  if (argv.squash) {
    // Squash all commits from past day
    await $`git --git-dir=.git-framework reset --soft "$(git --git-dir=.git-framework rev-list -1 --before='1 day ago' HEAD)"`;
    await $`git --git-dir=.git-framework commit -m 'Squashed commits'`;
  }

  await $`git --git-dir=.git-framework push -f`;
} catch (err) {
  await $`./scripts/helpers/switch-to-app.mjs`;
  throw err;
}

await $`./scripts/helpers/switch-to-app.mjs`;
