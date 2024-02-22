#!/bin/bash

export $(grep -v '^#' env/env | xargs)

if [ "$SERVER" == "production" ]; then
  echo "Shouldn't run in prod"
  exit 1
fi

if [ "$( docker container inspect -f '{{.State.Running}}' $(yarn dc ps -q materialize) )" != "true" ]; then
  yarn docker || { echo 'Docker failed' ; exit 1; }
fi

rm -rf build/$NODE_ENV

MINIMIZE=0 yarn ss buildTemplates
npx concurrently --names ",WEB" --prefix "{name}" --prefix-colors "blue" --kill-others \
  "scripts/watch-server.sh" \
  "scripts/watch-web.sh"
