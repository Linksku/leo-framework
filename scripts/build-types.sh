#!/bin/bash

start_time=$(date -d "1 minute ago" +"%Y-%m-%d %T")

# todo: low/mid pause monitor-infra when rebuilding models

mkdir -p ./framework/server/config/__generated__
echo "export const frameworkModels = [];
export const appModels = [];
" > ./framework/server/config/__generated__/allModels.ts
echo "module.exports = {
  frameworkModels: [],
  appModels: [],
};
" > ./framework/server/config/__generated__/allModels.cjs
echo "export const HAS_MVS = false;" > ./framework/server/config/__generated__/consts.ts

mkdir -p ./app/server/config/__generated__
echo "export const frameworkModels = [];
export const appModels = [];
" > ./app/server/config/__generated__/allModels.ts
echo "module.exports = {
  frameworkModels: [],
  appModels: [],
};
" > ./app/server/config/__generated__/allModels.cjs
echo "export const HAS_MVS = false;" > ./app/server/config/__generated__/consts.ts

rm -f ./framework/web/types/__generated__/globals.d.ts
rm -f ./app/web/types/__generated__/globals.d.ts
rm -f ./framework/server/types/__generated__/globals.d.ts
rm -f ./app/server/types/__generated__/globals.d.ts
rm -f ./framework/shared/types/__generated__/globals.d.ts
rm -f ./app/shared/types/__generated__/globals.d.ts

yarn ss buildModels || { echo 'buildModels failed' ; exit 1; }
yarn ss buildTypes || { echo 'buildTypes failed' ; exit 1; }

find \
  framework/web/types/__generated__ \
  app/web/types/__generated__ \
  framework/server/types/__generated__ \
  app/server/types/__generated__ \
  framework/shared/types/__generated__ \
  app/shared/types/__generated__ \
  -type f ! -newermt "$start_time" 2>/dev/null | xargs rm -rf
