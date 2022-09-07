#!/bin/bash
# Exit if anything fails
set -e

set -o allexport; source app/env; set +o allexport

export NODE_ENV=production
export SERVER=production

if [[ -n $(git log --oneline origin/master..HEAD) ]]; then
  echo "Push commits before deploying"
  exit 1
fi

SERVER=production scripts/build.sh

rm build.zip -f
zip -r build.zip build -x 'build/development*' -x 'build/production/server-script' -q

for i in {1..2}; do scp -r build.zip "root@$REMOTE_IP:$REMOTE_ROOT_DIR" && break; done
GIT_REVS=$(git rev-list --count master)
ssh "root@$REMOTE_IP" "source ~/.profile; cd $REMOTE_ROOT_DIR; scripts/post-deploy.sh $GIT_REVS"

rm build.zip
