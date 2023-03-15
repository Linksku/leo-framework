#!/usr/bin/env zx

import { $, argv } from 'zx';

const actualTZ = new Intl.DateTimeFormat().resolvedOptions().timeZone;

require('../framework/server/helpers/initDotenv.cjs');

let args = argv._;
if (!args.length) {
  args = ['run'];
}

await $`TZ=${actualTZ} DISPLAY= npx cypress ${args}`;
