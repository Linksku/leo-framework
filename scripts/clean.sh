#!/bin/bash

rm -rf build/*
rm -rf node_modules/.build
rm -rf node_modules/.cache
rm -f .eslintcache

rm -f framework/shared/tsconfig.tsbuildinfo
rm -f framework/server/tsconfig.tsbuildinfo
rm -f framework/web/tsconfig.tsbuildinfo
rm -f app/shared/tsconfig.tsbuildinfo
rm -f app/server/tsconfig.tsbuildinfo
rm -f app/web/tsconfig.tsbuildinfo

docker volume prune -f
