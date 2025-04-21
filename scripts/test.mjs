#!/usr/bin/env zx

// yarn test run --spec app/tests/.ts

import { $ } from 'zx';

const actualTZ = new Intl.DateTimeFormat().resolvedOptions().timeZone;

require('../framework/server/core/initEnv.cjs');

let args = ['run'];

if (process.argv.length > 3) {
  args = process.argv.slice(3);
}

await $`TZ=${actualTZ} DISPLAY= npx cypress ${args}`;
