#!/bin/bash

if [ -z "$TIMING" ]; then
  eslint *.js scripts framework app --ext=js,ts,tsx,cjs --cache "$@"
else
  eslint *.js scripts framework app --ext=js,ts,tsx,cjs "$@"
fi
stylelint 'framework/web/**/*.css' 'framework/web/**/*.scss' 'app/web/**/*.css' 'app/web/**/*.scss'
