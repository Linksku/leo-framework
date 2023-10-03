#!/bin/bash

PREVPID=$(ps faux | grep -- " webpack.js -w --config webpack.web.${NODE_ENV}.js " | grep -vw grep | awk '{ print $2 }');
if [ -n "$PREVPID" ] ; then
  kill -9 ${PREVPID};
fi
PREVPID=$(ps faux | grep -- " --watch webpack.web.${NODE_ENV}.js " | grep -vw grep | awk '{ print $2 }');
if [ -n "$PREVPID" ] ; then
  kill -9 ${PREVPID};
fi

npx nodemon -e js,cjs,ts \
  --watch webpack.web.${NODE_ENV}.js --watch webpack.web.js --watch webpack.common.js \
  --watch app/shared/types/__generated__/globals.d.ts \
  --watch app/web/types/__generated__/globals.d.ts \
  --watch framework/shared/settings.js \
  --watch package.json --watch yarn.lock --watch babel.config.cjs \
  -x "MINIMIZE=0 node --experimental-specifier-resolution=node --no-warnings node_modules/webpack/bin/webpack.js -w --config webpack.web.${NODE_ENV}.js"
