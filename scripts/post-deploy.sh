#!/bin/bash
# todo: low/mid if post-deploy.sh was updated, throw error and rerun
set -e
set -o allexport; source app/env; set +o allexport

pm2 stop $APP_NAME_LOWER
pm2 flush $APP_NAME_LOWER

git fetch origin
git reset --hard origin/master

GIT_REVS=$(git rev-list --count master)
if [ "$1" != "$GIT_REVS" ]; then
  printf "\033[0;31mLocal and remote git versions don't match."
  exit 1
fi

yarn

rm -rf build
unzip -q build.zip
rm build.zip

yarn docker
yarn migrate:up

pm2 start $APP_NAME_LOWER

chmod -R +x ./scripts
