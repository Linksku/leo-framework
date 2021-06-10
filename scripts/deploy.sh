#!/bin/bash
export $(grep -v '^#' src/env | xargs -d '\n')
export $(grep -v '^#' src/.env | xargs -d '\n')

yarn
if [[ $? != 0 ]]; then
  echo "Yarn failed."
  exit 1
fi

mkdir -p build
yarn clean

SERVER=production USE_SSL=1 DOMAIN_NAME=$DOMAIN_NAME PORT=80 yarn build-web
if [[ $? != 0 ]]; then
  echo "Build web failed."
  exit 1
fi
find build/web -name "*.LICENSE.txt" -type f -delete

SERVER=production USE_SSL=1 DOMAIN_NAME=$DOMAIN_NAME PORT=80 yarn build-server
if [[ $? != 0 ]]; then
  echo "Build server failed."
  exit 1
fi
find build/server -name "*.LICENSE.txt" -type f -delete

zip -r build.zip build
scp -r build.zip "root@${REMOTE_SERVER_IP}:${REMOTE_ROOT_DIR}"
rm build.zip
ssh "root@${REMOTE_SERVER_IP}" "${REMOTE_ROOT_DIR}/scripts/post-deploy.sh"
