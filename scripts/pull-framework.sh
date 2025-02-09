#!/bin/bash

if [[ -n $(git status --porcelain) ]]; then
  echo "App has uncommitted changes"
  exit 1
fi

git --git-dir=.git-framework co master

./scripts/helpers/switch-to-framework.sh || exit 1

git --git-dir=.git-framework checkout master -- yarn.lock
if [[ -n $(git --git-dir=.git-framework status --porcelain) ]]; then
  echo "Framework has uncommitted changes"
  ./scripts/helpers/switch-to-app.sh || exit 1
  exit 1
fi

git --git-dir=.git-framework fetch origin master
git --git-dir=.git-framework checkout origin/master -- .
git --git-dir=.git-framework add -A
git --git-dir=.git-framework commit -m 'Pull framework'

# git --git-dir=.git-framework rebase -X theirs origin/master
# if [ $? -ne 0 ]; then
#   echo "Conflicts in framework, run \"git --git-dir=.git-framework status\" to view"
# fi

./scripts/helpers/switch-to-app.sh || exit 1

yarn

git add -A
git commit -m 'Pull framework'
