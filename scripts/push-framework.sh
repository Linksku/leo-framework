#!/bin/bash

if [[ -n $(git status --porcelain) ]]; then
  echo "Commit changes before pushing"
  exit 1
fi

./scripts/helpers/switch-to-framework.sh || exit 1

git --git-dir=.git-framework co master
git --git-dir=.git-framework rm --cached `git --git-dir=.git-framework ls-files -i -c --exclude-from=.gitignore`
git --git-dir=.git-framework add -A
git --git-dir=.git-framework commit -m 'Squashed commits'
git --git-dir=.git-framework push -f

./scripts/helpers/switch-to-app.sh || exit 1
