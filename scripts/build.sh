#!/bin/bash

# Exit if anything fails
set -e

set -o allexport; source ./env; set +o allexport
export NODE_ENV=production
export SERVER=$BUILD_SERVER

mkdir -p build
rm -rf build/production

yarn build:types
npx concurrently \
  "node --experimental-specifier-resolution=node \
    node_modules/webpack/bin/webpack.js \
    --config webpack.web.production.js" \
  "MINIMIZE=0 yarn ss buildTemplates --no-docker" \
  "node --experimental-specifier-resolution=node \
    node_modules/webpack/bin/webpack.js \
    --config webpack.server.production.js"
