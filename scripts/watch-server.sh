#!/bin/bash

mkdir build/server
touch build/server/main.js
npx concurrently --kill-others "node --es-module-specifier-resolution=node node_modules/webpack/bin/webpack.js -w --config webpack.server.${NODE_ENV}.js" "TZ=UTC nodemon --es-module-specifier-resolution=node --inspect --async-stack-traces build/server/main.js --watch build/server/ --delay 2"
