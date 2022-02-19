#!/bin/bash

# Exit if anything fails
set -e

set -o allexport; source app/env; set +o allexport

export SERVER=production
export NODE_ENV=production

mkdir -p build
rm -rf build/production

node --max_old_space_size=4096 --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js \
  --config webpack.web.production.js
NODE_ENV=production SERVER=production yarn ss buildTemplates
node --max_old_space_size=4096 --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js \
  --config webpack.server.production.js
