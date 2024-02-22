#!/bin/bash

rm -rf node_modules/.build
rm -rf node_modules/.cache
rm -f .eslintcache
yarn cache clean

rm -f framework/shared/tsconfig.tsbuildinfo
rm -f framework/server/tsconfig.tsbuildinfo
rm -f framework/web/tsconfig.tsbuildinfo
rm -f app/shared/tsconfig.tsbuildinfo
rm -f app/server/tsconfig.tsbuildinfo
rm -f app/web/tsconfig.tsbuildinfo

# This deletes build cache, don't run too often
docker system prune --volumes -f
