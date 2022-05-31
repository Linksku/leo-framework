#!/bin/bash

npx nodemon -e js,cjs,ts \
  --watch webpack.web.${NODE_ENV}.js --watch webpack.web.js --watch webpack.common.js \
  --watch framework/web/config/globals.cjs --watch app/web/config/globals.cjs \
  --watch framework/shared/config/globals.cjs --watch app/shared/config/globals.cjs \
  --watch framework/shared/settings.js \
  --watch package.json --watch yarn.lock --watch babel.config.cjs \
  -x "node --es-module-specifier-resolution=node node_modules/webpack/bin/webpack.js -w --config webpack.web.${NODE_ENV}.js"
