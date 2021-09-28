#!/bin/bash

rm -rf web/types/generated
rm -rf src/web/types/generated
rm -rf server/types/generated
rm -rf src/server/types/generated

yarn ss buildGlobalTypes
npx concurrently \
  "yarn ss buildServerEntities" \
  "yarn ss buildWebEntities" \
  "yarn ss buildSharedEntities"
yarn ss buildApiTypes
