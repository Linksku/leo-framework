#!/bin/bash

set -o allexport; source app/env; set +o allexport

export SERVER=production
export NODE_ENV=production

yarn ss buildTemplates
cd capacitor
npx cordova-res android --skip-config --copy
npx cap sync android
cd -
