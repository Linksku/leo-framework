#!/bin/bash

set -o allexport; source ./env; set +o allexport

export SERVER=production
export NODE_ENV=production

mkdir -p build/production/web/js
node \
  --experimental-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.web.production.js \
  --profile --json \
  > build/production/web/stats.json
webpack-bundle-analyzer build/production/web/stats.json -p 6970
