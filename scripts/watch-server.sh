#!/bin/bash

mkdir build/server
touch build/server/main.js
npx concurrently --kill-others "webpack -w --config webpack.server.${NODE_ENV}.js" "TZ=UTC nodemon --inspect build/server/main.js --watch build/server/ --delay 2"
