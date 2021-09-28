#!/bin/bash

set -o allexport; source src/env; set +o allexport

mkdir -p build/web/js
ANALYZER=1 node --max_old_space_size=4096 --es-module-specifier-resolution=node node_modules/webpack/bin/webpack.js --config webpack.web.production.js --profile --json > build/web/stats.json
webpack-bundle-analyzer build/web/stats.json -p 6970
