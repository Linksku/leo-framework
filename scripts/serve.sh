#!/bin/bash
ARG_NODE_ENV="${NODE_ENV}"
set -o allexport; source ./env; set +o allexport
export NODE_ENV=${ARG_NODE_ENV:-${NODE_ENV}}

if [ $SERVER == "production" ]; then
  echo "Shouldn't run in prod"
  exit 1
fi

if [ "$( docker container inspect -f '{{.State.Running}}' materialize )" != "true" ]; then
  yarn docker || { echo 'Docker failed' ; exit 1; }
fi

yarn clean
rm -rf build/development

MINIMIZE=0 yarn ss buildTemplates
npx concurrently --names ",WEB" --prefix "{name}" --prefix-colors "blue" --kill-others \
  "scripts/watch-server.sh" \
  "scripts/watch-web.sh"
