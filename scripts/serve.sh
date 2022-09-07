#!/bin/bash
ARG_NODE_ENV="${NODE_ENV}"
set -o allexport; source app/env; set +o allexport
export NODE_ENV=${ARG_NODE_ENV:-${NODE_ENV}}

if [ "$( docker container inspect -f '{{.State.Running}}' materialize )" != "true" ]; then
  yarn docker || { echo 'Docker failed' ; exit 1; }
fi

yarn clean
yarn ss buildTemplates
npx concurrently --names ",WEB" --prefix "{name}" --prefix-colors "blue" --kill-others \
  "scripts/watch-server.sh" \
  "scripts/watch-web.sh"
