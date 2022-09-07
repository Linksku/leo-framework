#!/bin/bash

# Exit if anything fails
set -e

ARG_SERVER="${SERVER}"
set -o allexport; source app/env; set +o allexport
export NODE_ENV=production
export SERVER=${ARG_SERVER:-${SERVER}}

mkdir -p build
rm -rf build/production

npx concurrently \
  "node --experimental-specifier-resolution=node \
    node_modules/webpack/bin/webpack.js \
    --config webpack.web.production.js" \
  "yarn ss buildTemplates" \
  "node --experimental-specifier-resolution=node \
    node_modules/webpack/bin/webpack.js \
    --config webpack.server.production.js"
