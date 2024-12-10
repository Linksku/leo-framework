#!/bin/bash
# Note: if `yarn stats` is OOM, try `yarn build` first
set -e

export SERVER=production
export NODE_ENV=production

mkdir -p build/production/server/js
ANALYZE_STATS=1 node \
  --experimental-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server.production.js \
  --profile --json \
  > build/production/server/stats.json
npx webpack-bundle-analyzer build/production/server/stats.json -p 9002

mkdir -p tmp
mv build/production/server/stats.json tmp
