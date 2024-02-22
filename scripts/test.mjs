#!/usr/bin/env zx

// yarn test run --spec app/tests/.ts

import { $, argv } from 'zx';

const actualTZ = new Intl.DateTimeFormat().resolvedOptions().timeZone;

require('../framework/server/core/initEnv.cjs');

let args = ['run'];
if (argv._.length) {
  args = process.argv.slice(3);
}

await $`TZ=${actualTZ} DISPLAY= npx cypress ${args}`;
