#!/bin/bash

mkdir build/$NODE_ENV/server
touch build/$NODE_ENV/server/main.js

watch_config_arg="nodemon -e js,cjs,ts \
  --watch webpack.server.$NODE_ENV.js --watch webpack.server.js --watch webpack.common.js \
  --watch framework/server/config/globals.cjs --watch app/server/config/globals.cjs \
  --watch framework/shared/config/globals.cjs --watch app/shared/config/globals.cjs \
  --watch app/server/types/__generated__/globals.d.ts \
  --watch framework/shared/settings.js \
  --watch package.json --watch yarn.lock --watch babel.config.cjs \
  -x \"node --es-module-specifier-resolution=node node_modules/webpack/bin/webpack.js -w --config webpack.server.$NODE_ENV.js\""
npx concurrently --names "SRV-WBPK,SRV" --prefix "{name}" --prefix-colors "blue" --kill-others \
  "$watch_config_arg" \
  "TZ=UTC nodemon --es-module-specifier-resolution=node --inspect --async-stack-traces --enable-source-maps --watch build/$NODE_ENV/server/ --delay 1 build/$NODE_ENV/server/main.js"
