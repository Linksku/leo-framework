#!/bin/bash

set -o allexport; source src/env; set +o allexport

export SERVER=production
export NODE_ENV=production

yarn ss buildTemplates
npx cordova-res android --skip-config --copy
npx cap sync android
