#!/bin/bash
# Note: if `yarn stats` is OOM, try `yarn build` first
set -e

export SERVER=production
export NODE_ENV=production

mkdir -p build/production/web/js
ANALYZE_STATS=1 node \
  --experimental-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.web.production.js \
  --profile --json \
  > build/production/web/stats.json
npx webpack-bundle-analyzer build/production/web/stats.json -p 9002

mkdir -p tmp
mv build/production/web/stats.json tmp
