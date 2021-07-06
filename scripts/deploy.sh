#!/bin/bash
# Exit if anything fails
set -e

set -o allexport; source src/env; set +o allexport

scripts/build.sh

zip -r build.zip build
for i in {1..3}; do scp -r build.zip "root@$REMOTE_IP:$REMOTE_ROOT_DIR" && break; done
GIT_REVS=$(git rev-list --count master)
ssh "root@$REMOTE_IP" "cd $REMOTE_ROOT_DIR && scripts/post-deploy.sh $GIT_REVS"
rm build.zip
