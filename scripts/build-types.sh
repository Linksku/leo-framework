#!/bin/bash

rm -rf web/types/generated
rm -rf src/web/types/generated
rm -rf server/types/generated
rm -rf src/server/types/generated

set -o allexport; source src/env; set +o allexport

npx concurrently \
  "node scripts/build-global-types web/config/globals.js web/types/generated/globals.d.ts" \
  "node scripts/build-global-types src/web/config/globals.js src/web/types/generated/globals.d.ts" \
  "node scripts/build-global-types server/config/globals.js server/types/generated/globals.d.ts" \
  "node scripts/build-global-types src/server/config/globals.js src/server/types/generated/globals.d.ts"
npx concurrently "yarn ss buildServerEntities" "yarn ss buildWebEntities" "yarn ss buildSharedEntities"
yarn ss buildApiTypes
