#!/usr/bin/env zx

import { $, argv } from 'zx';

require('../framework/server/core/initEnv.cjs');

$.verbose = true;

/*
Cypress crashes too often, e.g.:
renderer-process-crashed" err_failed (-2)
gpu_process_host.cc(991) GPU process exited unexpectedly: exit_code=9
x11_software_bitmap_presenter.cc(141) XGetWindowAttributes failed for window 2097154
*/
const ENABLE_CYPRESS = false;

// yarn deploy --no-verify
if (argv.verify !== false) {
  if (ENABLE_CYPRESS && !await $`lsof -Pi :9001 -sTCP:LISTEN -t`) {
    throw new Error('Server needs to be running for Cypress');
  }

  await $`yarn clean --no-docker`;
  await $`yarn build:types`;
  await $`yarn pgdump`;

  const changes = await $`git status --porcelain`;
  if (changes.stdout || changes.stderr) {
    throw new Error('Got changes from build');
  }

  await Promise.all([
    $`yarn lint`,
    $`yarn tsc`,
    ENABLE_CYPRESS && $`yarn test run --quiet`,
  ]);
}
