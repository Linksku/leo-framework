#!/bin/bash

set -o allexport; source app/env; set +o allexport

name=$1
shift
if [ -f "build/$NODE_ENV/server/$name.js" ]; then
  rm build/$NODE_ENV/server/$name.js
fi

if [ -e "framework/server/scripts/$name.js" ] || [ -e "framework/server/scripts/$name.ts" ]; then
  SCRIPT_PATH="framework/server/scripts/$name" \
  node --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server.$NODE_ENV.js \
  --entry ./framework/server/lib/serverScript \
  --entry "./framework/server/scripts/$name" \
  --output-filename $name.js
  node --es-module-specifier-resolution=node $PREFIX build/$NODE_ENV/server/$name.js $@
elif [ -e "framework/server/scripts/$name/index.js" ] || [ -e "framework/server/scripts/$name/index.ts" ]; then
  SCRIPT_PATH="framework/server/scripts/$name/index" \
  node --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server.$NODE_ENV.js \
  --entry ./framework/server/lib/serverScript \
  --entry "./framework/server/scripts/$name/index" \
  --output-filename $name.js
  node --es-module-specifier-resolution=node $PREFIX build/$NODE_ENV/server/$name.js $@
elif [ -e "app/server/scripts/$name.js" ] || [ -e "app/server/scripts/$name.ts" ]; then
  SCRIPT_PATH="app/server/scripts/$name" node --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server.$NODE_ENV.js \
  --entry ./framework/server/lib/serverScript \
  --entry "./app/server/scripts/$name" \
  --output-filename $name.js
  node --es-module-specifier-resolution=node $PREFIX build/$NODE_ENV/server/$name.js $@
elif [ -e "app/server/scripts/$name/index.js" ] || [ -e "app/server/scripts/$name/index.ts" ]; then
  SCRIPT_PATH="app/server/scripts/$name/index" \
  node --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server.$NODE_ENV.js \
  --entry ./framework/server/lib/serverScript \
  --entry "./app/server/scripts/$name/index" \
  --output-filename $name.js
  node --es-module-specifier-resolution=node $PREFIX build/$NODE_ENV/server/$name.js $@
else
  echo "Script not found"
fi
