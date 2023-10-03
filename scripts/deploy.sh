#!/bin/bash
# Exit if anything fails
set -e

set -o allexport; source ./env; set +o allexport
export $(grep -v '^#' .env | xargs)

if [[ -n $(git status --porcelain) ]]; then
  echo "Commit changes before deploying"
  exit 1
fi

if [[ -n $(git log --oneline origin/master..HEAD) ]]; then
  echo "Push commits before deploying"
  exit 1
fi

eval `ssh-agent -t 600`
ssh-add

./scripts/pre-deploy.mjs "$@"

rm -rf build/production/*
BUILD_SERVER=production scripts/build.sh
if [[ -n $(git status --porcelain) ]]; then
  echo "Got changes from build"
  exit 1
fi
NODE_ENV=production SERVER=production scripts/build-server-script.sh monitorInfra

docker build -t server -f framework/infra/server-dockerfile .
docker save -o build.tar server

scp build.tar "root@$REMOTE_IP:$REMOTE_ROOT_DIR"
GIT_REVS=$(git rev-list --count master)
ssh -tt "root@$REMOTE_IP" "source ~/.profile; cd $REMOTE_ROOT_DIR; git fetch origin; git reset --hard origin/master; scripts/post-deploy.sh $GIT_REVS"

curl -s -S --output /dev/null \
  -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "X-Auth-Email: $CF_USERNAME" \
  -H "X-Auth-Key: $CF_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}' \
  && echo 'Purged Cloudflare cache'

rm build.tar
