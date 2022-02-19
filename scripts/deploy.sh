#!/bin/bash
# Exit if anything fails
set -e

set -o allexport; source app/env; set +o allexport

if [[ -n $(git log --oneline origin/master..HEAD) ]]; then
  echo "Push latest commits"
  exit 1
fi

scripts/build.sh

rm build.zip -f
zip -r build.zip build -x '*server/development*'

for i in {1..3}; do scp -r build.zip "root@$REMOTE_IP:$REMOTE_ROOT_DIR" && break; done
GIT_REVS=$(git rev-list --count master)
ssh "root@$REMOTE_IP" "cd $REMOTE_ROOT_DIR && scripts/post-deploy.sh $GIT_REVS"
rm build.zip
