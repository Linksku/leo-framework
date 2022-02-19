#!/bin/bash

eslint *.js scripts framework app --ext=js,ts,tsx,cjs --quiet --cache \
  --rule '@typescript-eslint/no-floating-promises: 2' \
  --rule '@typescript-eslint/no-misused-promises: 2'
stylelint 'framework/web/**/*.css' 'framework/web/**/*.scss' 'app/web/**/*.css' 'app/web/**/*.scss'
