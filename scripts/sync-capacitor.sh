#!/bin/bash

# Android Studio can't build in WSL.
# 1. copy capacitor/android, node_modules/@capacitor/android/capacitor,
#   and build/production/web/capacitor to Windows
# 2. run `yarn`
# todo: low/mid zx sync-capacitor for cross-plat

yarn

SERVER=production NODE_ENV=production MINIMIZE=0 yarn ss buildTemplates --no-docker

npx capacitor-assets generate \
  --assetPath capacitor/resources \
  --android --ios \
  --androidProject capacitor/android --iosProject capacitor/ios/App \
  --logoSplashScale 1 \
  --iconBackgroundColor '#ffffff' --iconBackgroundColorDark '#222222' \
  --splashBackgroundColor '#f8f8f8' --splashBackgroundColorDark '#111111'
npx cap sync android
npx cap sync ios

if [[ "$OSTYPE" == "darwin"* ]]; then
  cd capacitor/ios/App
  pod install
  cd ../../..
fi
