#!/bin/bash

set -o allexport; source src/env; set +o allexport

name=$1
shift
if [ -f "build/server/$name.js" ]; then
  rm build/server/$name.js
fi

if [ -e "server/scripts/$name.js" ]; then
  SCRIPT_PATH="server/scripts/$name.js" npx webpack --config webpack.server.js --entry ./server/lib/serverScript.js --output-filename $name.js
  node build/server/$name.js $@
elif [ -e "server/scripts/$name/index.js" ]; then
  SCRIPT_PATH="server/scripts/$name/index.js" npx webpack --config webpack.server.js --entry ./server/lib/serverScript.js --output-filename $name.js
  node build/server/$name.js $@
elif [ -e "server/scripts/$name.ts" ]; then
  SCRIPT_PATH="server/scripts/$name.ts" npx webpack --config webpack.server.js --entry ./server/lib/serverScript.js --output-filename $name.js
  node build/server/$name.js $@
elif [ -e "server/scripts/$name/index.ts" ]; then
  SCRIPT_PATH="server/scripts/$name/index.ts" npx webpack --config webpack.server.js --entry ./server/lib/serverScript.js --output-filename $name.js
  node build/server/$name.js $@
elif [ -e "src/server/scripts/$name.js" ]; then
  SCRIPT_PATH="src/server/scripts/$name.js" npx webpack --config webpack.server.js --entry ./server/lib/serverScript.js --output-filename $name.js
  node build/server/$name.js $@
elif [ -e "src/server/scripts/$name/index.js" ]; then
  SCRIPT_PATH="src/server/scripts/$name/index.js" npx webpack --config webpack.server.js --entry ./server/lib/serverScript.js --output-filename $name.js
  node build/server/$name.js $@
elif [ -e "src/server/scripts/$name.ts" ]; then
  SCRIPT_PATH="src/server/scripts/$name.ts" npx webpack --config webpack.server.js --entry ./server/lib/serverScript.js --output-filename $name.js
  node build/server/$name.js $@
elif [ -e "src/server/scripts/$name/index.ts" ]; then
  SCRIPT_PATH="src/server/scripts/$name/index.ts" npx webpack --config webpack.server.js --entry ./server/lib/serverScript.js --output-filename $name.js
  node build/server/$name.js $@
else
  echo "Script not found"
fi
