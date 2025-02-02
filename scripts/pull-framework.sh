#!/bin/bash

if [[ -n $(git status --porcelain) ]]; then
  echo "Commit changes before pulling"
  exit 1
fi

git --git-dir=.git-framework add -A
git --git-dir=.git-framework commit -m 'App commits'
git --git-dir=.git-framework fetch origin master
git --git-dir=.git-framework rebase origin/master
git add -A
git commit -m 'Framework commits'
