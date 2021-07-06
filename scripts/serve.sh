#!/bin/bash
ARG_NODE_ENV="${NODE_ENV}"
set -o allexport; source src/env; set +o allexport

yarn clean
node scripts/build-templates.js
npx concurrently --kill-others "NODE_ENV=${ARG_NODE_ENV} scripts/watch-server.sh" "NODE_ENV=${ARG_NODE_ENV} scripts/watch-web.sh"
