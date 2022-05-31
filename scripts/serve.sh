#!/bin/bash
ARG_NODE_ENV="${NODE_ENV}"
set -o allexport; source app/env; set +o allexport

yarn clean
yarn ss buildTemplates
npx concurrently --names ",WEB" --prefix "{name}" --prefix-colors "blue" --kill-others \
  "NODE_ENV=${ARG_NODE_ENV} scripts/watch-server.sh" \
  "NODE_ENV=${ARG_NODE_ENV} scripts/watch-web.sh"
