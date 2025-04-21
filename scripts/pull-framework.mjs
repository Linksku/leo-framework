#!/usr/bin/env zx

import {
  $,
  argv,
  fs,
  path,
} from 'zx';

require('../framework/server/core/initEnv.cjs');

$.verbose = true;

const IGNORE_CHANGES = [
  'package.json',
  'yarn.lock',
];

if ((await $`git status --porcelain`).stdout) {
  console.log('App has uncommitted changes');
  process.exit(1);
}

await $`git --git-dir=.git-framework co master`;

await $`./scripts/helpers/switch-to-framework.mjs`;

try {
  await $`git --git-dir=.git-framework fetch origin master`;

  if (!argv['skip-uncommitted']) {
    const gitDiffMaster = (await $`git --git-dir=.git-framework diff --stat origin/master`)
      .stdout
      .trim()
      .split('\n')
      .map(line => line.trim().split(' ', 2)[0]);
    const gitDiffParent = (await $`git --git-dir=.git-framework diff --stat`)
      .stdout
      .trim()
      .split('\n')
      .map(line => line.trim().split(' ', 2)[0]);
    const bothChanged = gitDiffMaster
      .filter(f => !IGNORE_CHANGES.includes(f) && gitDiffParent.includes(f));
    if (bothChanged.length) {
      console.log(`Framework has uncommitted changes: ${bothChanged.join(', ')}`);
      await $`./scripts/helpers/switch-to-app.mjs`;
      process.exit(1);
    }
  }

  // Pull changes from master
  await $`git --git-dir=.git-framework checkout origin/master -- .`;
  for (const fileName of IGNORE_CHANGES) {
    await $`git --git-dir=.git-framework checkout master -- ${fileName}`;
  }
  // Delete files deleted in master
  await $`git --git-dir=.git-framework diff --name-only --diff-filter=D HEAD origin/master | xargs -r rm`;
  await $`git --git-dir=.git-framework add -A`;
  await $`git --git-dir=.git-framework commit -m 'Pull framework'`;

  // git --git-dir=.git-framework rebase -X theirs origin/master
  // if [ $? -ne 0 ]; then
  //   echo "Conflicts in framework, run \"git --git-dir=.git-framework status\" to view"
  // fi
} catch (err) {
  await $`./scripts/helpers/switch-to-app.mjs`;
  throw err;
}

await $`./scripts/helpers/switch-to-app.mjs`;

for (const dir of ['server', 'shared', 'web']) {
  const configTemplates = await fs.readdir(path.resolve(`./app-template/${dir}/config/`));
  for (const fileName of configTemplates) {
    try {
      await fs.access(path.resolve(`./app/${dir}/config/${fileName}`));
    } catch {
      await fs.copyFile(
        path.resolve(`./app-template/${dir}/config/${fileName}`),
        path.resolve(`./app/${dir}/config/${fileName}`),
      );
    }
  }
}

try {
  // Don't know why Yarn PnP patch fails sometimes
  await $`yarn`;
} catch {
  await $`yarn`;
}

await $`git add -A`;
await $`git commit -m 'Pull framework'`;
