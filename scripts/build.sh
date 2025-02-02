#!/bin/bash
# Exit if anything fails
set -e

mkdir -p build
rm -rf build/production

# todo: low/easy update caniuse-lite automatically

yarn build:types

export NODE_ENV=production
export SERVER=$BUILD_SERVER

npx concurrently \
  "node --experimental-specifier-resolution=node \
    node_modules/webpack/bin/webpack.js \
    --config webpack.web.production.js" \
  "MINIMIZE=0 yarn ss buildTemplates --no-docker" \
  "node --experimental-specifier-resolution=node \
    node_modules/webpack/bin/webpack.js \
    --config webpack.server.production.js"
