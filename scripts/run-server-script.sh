#!/bin/bash

set -o allexport; source src/env; set +o allexport

name=$1
shift
if [ -f "build/server/$name.js" ]; then
  rm build/server/$name.js
fi

if [ -e "server/scripts/$name.js" ] || [ -e "server/scripts/$name.ts" ]; then
  SCRIPT_PATH="server/scripts/$name" \
  node --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server.js \
  --entry ./server/lib/serverScript \
  --entry "./server/scripts/$name" \
  --output-filename $name.js
  node --es-module-specifier-resolution=node $PREFIX build/server/$name.js $@
elif [ -e "server/scripts/$name/index.js" ] || [ -e "server/scripts/$name/index.ts" ]; then
  SCRIPT_PATH="server/scripts/$name/index" \
  node --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server.js \
  --entry ./server/lib/serverScript \
  --entry "./server/scripts/$name/index" \
  --output-filename $name.js
  node --es-module-specifier-resolution=node $PREFIX build/server/$name.js $@
elif [ -e "src/server/scripts/$name.js" ] || [ -e "src/server/scripts/$name.ts" ]; then
  SCRIPT_PATH="src/server/scripts/$name" node --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server.js \
  --entry ./server/lib/serverScript \
  --entry "./src/server/scripts/$name" \
  --output-filename $name.js
  node --es-module-specifier-resolution=node $PREFIX build/server/$name.js $@
elif [ -e "src/server/scripts/$name/index.js" ] || [ -e "src/server/scripts/$name/index.ts" ]; then
  SCRIPT_PATH="src/server/scripts/$name/index" \
  node --es-module-specifier-resolution=node \
  node_modules/webpack/bin/webpack.js --config webpack.server.js \
  --entry ./server/lib/serverScript \
  --entry "./src/server/scripts/$name/index" \
  --output-filename $name.js
  node --es-module-specifier-resolution=node $PREFIX build/server/$name.js $@
else
  echo "Script not found"
fi
