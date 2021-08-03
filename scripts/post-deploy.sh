#!/bin/bash

set -o allexport; source src/env; set +o allexport

git fetch origin
git reset --hard origin/master

GIT_REVS=$(git rev-list --count master)
if [ "$1" != "$GIT_REVS" ]; then
  printf "\033[0;31mLocal and remote git versions don't match."
  exit 1
fi

NODE_ENV=production yarn

rm -rf build
unzip build.zip
rm build.zip

pm2 restart $APP_NAME_LOWER
chmod -R +x scripts
