#!/bin/bash

start_time=$(date -d "1 minute ago" +"%Y-%m-%d %T")

yarn ss buildModels || { echo 'buildModels failed' ; exit 1; }
yarn ss buildGlobalTypes || { echo 'buildGlobalTypes failed' ; exit 1; }
npx concurrently \
  "yarn ss buildServerModelsTypes" \
  "yarn ss buildServerModelClasses" \
  "yarn ss buildWebModelsTypes" \
  "yarn ss buildSharedModelsTypes" \
  || { echo 'buildModelsTypes failed' ; exit 1; }
yarn ss buildApiTypes || { echo 'buildApiTypes failed' ; exit 1; }

find \
  framework/web/types/__generated__ \
  app/web/types/__generated__ \
  framework/server/types/__generated__ \
  app/server/types/__generated__ \
  framework/shared/types/__generated__ \
  app/shared/types/__generated__ \
  -type f ! -newermt "$start_time" 2>/dev/null | xargs rm -rf
