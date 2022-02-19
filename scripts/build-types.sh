#!/bin/bash

start_time=$(date -d "1 minute ago" +"%Y-%m-%d %T")

yarn ss buildGlobalTypes || { echo 'buildGlobalTypes failed' ; exit 1; }
npx concurrently \
  "yarn ss buildServerModelsTypes" \
  "yarn ss buildWebModelsTypes" \
  "yarn ss buildSharedModelsTypes" \
  || { echo 'buildModelsTypes failed' ; exit 1; }
yarn ss buildApiTypes || { echo 'buildApiTypes failed' ; exit 1; }

find \
  framework/web/types/generated \
  app/web/types/generated \
  framework/server/types/generated \
  app/server/types/generated \
  framework/shared/types/generated \
  app/shared/types/generated \
  -type f ! -newermt "$start_time" 2>/dev/null | xargs rm -rf
