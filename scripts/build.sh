#!/bin/bash

# Exit if anything fails
set -e

set -o allexport; source src/env; set +o allexport

export SERVER=production
export NODE_ENV=production

mkdir -p build
yarn clean

node --max_old_space_size=4096 --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js \
  --config webpack.web.production.js
yarn ss buildTemplates
node --max_old_space_size=4096 --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js \
  --config webpack.server.production.js
