#!/bin/bash

if [ -z "$TIMING" ]; then
  ESLINT_USE_FLAT_CONFIG=false eslint *.js *.cjs scripts framework app --cache "$@" || exit 1
  stylelint 'framework/web/**/*.css' 'framework/web/**/*.scss' 'app/web/**/*.css' 'app/web/**/*.scss' || exit 1
else
  ESLINT_USE_FLAT_CONFIG=false eslint *.js *.cjs scripts framework app "$@" || exit 1
fi
