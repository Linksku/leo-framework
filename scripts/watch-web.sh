#!/bin/bash

node --es-module-specifier-resolution=node node_modules/webpack/bin/webpack.js -w --config webpack.web.${NODE_ENV}.js
