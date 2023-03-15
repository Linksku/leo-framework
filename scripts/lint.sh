#!/bin/bash

if [ -z "$TIMING" ]; then
  eslint *.js *.cjs scripts framework app --cache "$@"
else
  eslint *.js *.cjs scripts framework app "$@"
fi
stylelint 'framework/web/**/*.css' 'framework/web/**/*.scss' 'app/web/**/*.css' 'app/web/**/*.scss'
