#!/bin/bash

# Note: can't build in WSL, need to copy capacitor/android and node_modules/@capacitor/android/capacitor to Windows

set -o allexport; source ./env; set +o allexport

SERVER=production NODE_ENV=production MINIMIZE=0 yarn ss buildTemplates

cd capacitor
npx capacitor-assets generate --android \
  --iconBackgroundColor '#ffffff' --iconBackgroundColorDark '#222222' --splashBackgroundColor '#f8f8f8' --splashBackgroundColorDark '#111111'
npx cap sync android
cd -
