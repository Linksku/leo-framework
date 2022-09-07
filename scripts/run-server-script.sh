#!/bin/bash

ARG_NODE_ENV="${NODE_ENV}"
ARG_SERVER="${SERVER}"
set -o allexport; source app/env; set +o allexport
export NODE_ENV=${ARG_NODE_ENV:-${NODE_ENV}}
export SERVER=${ARG_SERVER:-${SERVER}}

name=$1
shift
if [ -f "build/development/server/$name.js" ]; then
  rm build/development/server/$name.js
fi

if [ -e "framework/server/scripts/$name.js" ] || [ -e "framework/server/scripts/$name.ts" ]; then
  NODE_ENV=$NODE_ENV \
  SERVER=$SERVER \
  SCRIPT_PATH="framework/server/scripts/$name" \
  node --experimental-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server-script.js \
  --entry ./framework/server/serverScript \
  --entry "./framework/server/scripts/$name" \
  --output-filename $name.js
  node --experimental-specifier-resolution=node $PREFIX build/development/server-script/$name.js $@
elif [ -e "framework/server/scripts/$name/index.js" ] || [ -e "framework/server/scripts/$name/index.ts" ]; then
  NODE_ENV=$NODE_ENV \
  SERVER=$SERVER \
  SCRIPT_PATH="framework/server/scripts/$name/index" \
  node --experimental-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server-script.js \
  --entry ./framework/server/serverScript \
  --entry "./framework/server/scripts/$name/index" \
  --output-filename $name.js
  node --experimental-specifier-resolution=node $PREFIX build/development/server-script/$name.js $@
elif [ -e "app/server/scripts/$name.js" ] || [ -e "app/server/scripts/$name.ts" ]; then
  NODE_ENV=$NODE_ENV \
  SERVER=$SERVER \
  SCRIPT_PATH="app/server/scripts/$name" node --experimental-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server-script.js \
  --entry ./framework/server/serverScript \
  --entry "./app/server/scripts/$name" \
  --output-filename $name.js
  node --experimental-specifier-resolution=node $PREFIX build/development/server-script/$name.js $@
elif [ -e "app/server/scripts/$name/index.js" ] || [ -e "app/server/scripts/$name/index.ts" ]; then
  NODE_ENV=$NODE_ENV \
  SERVER=$SERVER \
  SCRIPT_PATH="app/server/scripts/$name/index" \
  node --experimental-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server-script.js \
  --entry ./framework/server/serverScript \
  --entry "./app/server/scripts/$name/index" \
  --output-filename $name.js
  node --experimental-specifier-resolution=node $PREFIX build/development/server-script/$name.js $@
else
  echo "Script not found"
fi
