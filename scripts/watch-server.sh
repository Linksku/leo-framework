#!/bin/bash

PREVPID=$(ps faux | grep -- "webpack.js -w --config webpack.server.$NODE_ENV.js" | grep -vw grep | awk '{ print $2 }');
if [ -n "$PREVPID" ] ; then
  kill -9 ${PREVPID};
fi
PREVPID=$(ps faux | grep -- " webpack.js -w --config webpack.server-script.$NODE_ENV.js " | grep -vw grep | awk '{ print $2 }');
if [ -n "$PREVPID" ] ; then
  kill -9 ${PREVPID};
fi
PREVPID=$(ps faux | grep -- " --watch webpack.server.$NODE_ENV.js " | grep -vw grep | awk '{ print $2 }');
if [ -n "$PREVPID" ] ; then
  kill -9 ${PREVPID};
fi
PREVPID=$(ps faux | grep -- " --watch build/$NODE_ENV/server/ " | grep -vw grep | awk '{ print $2 }');
if [ -n "$PREVPID" ] ; then
  kill -9 ${PREVPID};
fi
PREVPID=$(ps faux | grep -- " --watch build/$NODE_ENV/server-script/monitorInfra.js " | grep -vw grep | awk '{ print $2 }');
if [ -n "$PREVPID" ] ; then
  kill -9 ${PREVPID};
fi

mkdir -p build/$NODE_ENV/server
touch build/$NODE_ENV/server/main.js
touch build/$NODE_ENV/server-script/monitorInfra.js

rebuild_server="nodemon -e js,cjs,ts \
  --watch webpack.server.$NODE_ENV.js --watch webpack.server.js --watch webpack.common.js \
  --watch app/shared/types/__generated__/globals.d.ts \
  --watch app/server/types/__generated__/globals.d.ts \
  --watch app/server/types/__generated__/allModels.cjs \
  --watch framework/shared/settings.js \
  --watch env/env.dev --watch env/secrets \
  --watch package.json --watch yarn.lock --watch babel.config.cjs \
  -x \"MINIMIZE=0 node --experimental-specifier-resolution=node --no-warnings node_modules/webpack/bin/webpack.js -w \\
    --config webpack.server.$NODE_ENV.js\""
rebuild_monitor="nodemon -e js,cjs,ts \
  --watch webpack.server-script.$NODE_ENV.js \
  --watch webpack.server.$NODE_ENV.js --watch webpack.server.js --watch webpack.common.js \
  --watch app/shared/types/__generated__/globals.d.ts \
  --watch app/server/types/__generated__/globals.d.ts \
  --watch app/server/types/__generated__/allModels.d.ts \
  --watch framework/shared/settings.js \
  --watch env/env.dev --watch env/secrets \
  --watch package.json --watch yarn.lock --watch babel.config.cjs \
  -x \"MINIMIZE=0 SERVER_SCRIPT_PATH=framework/server/scripts/monitorInfra \\
    node --experimental-specifier-resolution=node --no-warnings node_modules/webpack/bin/webpack.js -w \\
    --config webpack.server-script.$NODE_ENV.js \\
    --entry-reset \\
    --entry ./framework/server/serverScript \\
    --entry ./framework/server/scripts/monitorInfra/monitorInfra.ts \\
    --output-filename monitorInfra.js\""
npx concurrently --names "SRV-WBPK,MZ-WBPK,SRV,MZ" --prefix "{name}" --prefix-colors "blue" --kill-others \
  "$rebuild_server" \
  "$rebuild_monitor" \
  "TZ=UTC nodemon --experimental-specifier-resolution=node --no-warnings --inspect --async-stack-traces --enable-source-maps --watch build/$NODE_ENV/server/ --delay 1 build/$NODE_ENV/server/main.js" \
  "TZ=UTC nodemon --experimental-specifier-resolution=node --no-warnings --inspect=9230 --async-stack-traces --enable-source-maps --watch build/$NODE_ENV/server-script/monitorInfra.js --delay 1 build/$NODE_ENV/server-script/monitorInfra.js"
