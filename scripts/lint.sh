#!/bin/bash

if [ -z "$TIMING" ]; then
  eslint *.js *.cjs scripts framework app --cache "$@" || exit 1
else
  eslint *.js *.cjs scripts framework app "$@" || exit 1
fi
stylelint 'framework/web/**/*.css' 'framework/web/**/*.scss' 'app/web/**/*.css' 'app/web/**/*.scss' || exit 1
