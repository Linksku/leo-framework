#!/bin/bash

ARG_NODE_ENV=$NODE_ENV
export $(grep -v '^#' env/env.dev | xargs)
NODE_ENV=$ARG_NODE_ENV

if [ "$SERVER" == "production" ]; then
  echo "Shouldn't run in prod"
  exit 1
fi

if [ "$( docker container inspect -f '{{.State.Running}}' $(yarn dc ps -q redis) )" != "true" ]; then
  yarn docker || { echo 'Docker failed' ; exit 1; }
fi

rm -rf build/$NODE_ENV

MINIMIZE=0 yarn ss buildTemplates
npx concurrently \
  --names ",WEB" --prefix "{name}" --prefix-colors "blue" --kill-others \
  "NODE_ENV=$NODE_ENV scripts/watch-server.sh" \
  "NODE_ENV=$NODE_ENV scripts/watch-web.sh"
