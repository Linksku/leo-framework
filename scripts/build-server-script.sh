#!/bin/bash

ARG_NODE_ENV="${NODE_ENV}"
ARG_SERVER="${SERVER}"
set -o allexport; source ./env; set +o allexport
export NODE_ENV=${ARG_NODE_ENV:-${NODE_ENV}}
export SERVER=${ARG_SERVER:-${SERVER}}

name=$1

if [ -f "build/$NODE_ENV/server/$name.js" ]; then
  rm build/$NODE_ENV/server/$name.js
fi

if [ -e "framework/server/scripts/$name.js" ] || [ -e "framework/server/scripts/$name.ts" ]; then
  NODE_ENV=$NODE_ENV \
  SERVER=$SERVER \
  SERVER_SCRIPT_PATH="framework/server/scripts/$name" \
  node --experimental-specifier-resolution=node --no-warnings \
  node_modules/webpack/bin/webpack.js --config "webpack.server-script.$NODE_ENV.js" \
  --entry-reset \
  --entry ./framework/server/serverScript \
  --entry "./framework/server/scripts/$name" \
  --output-filename $name.js
elif [ -e "framework/server/scripts/$name/index.js" ] || [ -e "framework/server/scripts/$name/index.ts" ]; then
  NODE_ENV=$NODE_ENV \
  SERVER=$SERVER \
  SERVER_SCRIPT_PATH="framework/server/scripts/$name/index" \
  node --experimental-specifier-resolution=node --no-warnings \
  node_modules/webpack/bin/webpack.js --config "webpack.server-script.$NODE_ENV.js" \
  --entry-reset \
  --entry ./framework/server/serverScript \
  --entry "./framework/server/scripts/$name/index" \
  --output-filename $name.js
elif [ -e "app/server/scripts/$name.js" ] || [ -e "app/server/scripts/$name.ts" ]; then
  NODE_ENV=$NODE_ENV \
  SERVER=$SERVER \
  SERVER_SCRIPT_PATH="app/server/scripts/$name" node --experimental-specifier-resolution=node --no-warnings \
  node_modules/webpack/bin/webpack.js --config "webpack.server-script.$NODE_ENV.js" \
  --entry-reset \
  --entry ./framework/server/serverScript \
  --entry "./app/server/scripts/$name" \
  --output-filename $name.js
elif [ -e "app/server/scripts/$name/index.js" ] || [ -e "app/server/scripts/$name/index.ts" ]; then
  NODE_ENV=$NODE_ENV \
  SERVER=$SERVER \
  SERVER_SCRIPT_PATH="app/server/scripts/$name/index" \
  node --experimental-specifier-resolution=node --no-warnings \
  node_modules/webpack/bin/webpack.js --config "webpack.server-script.$NODE_ENV.js" \
  --entry-reset \
  --entry ./framework/server/serverScript \
  --entry "./app/server/scripts/$name/index" \
  --output-filename $name.js
else
  echo "Script not found"
  exit 1
fi
