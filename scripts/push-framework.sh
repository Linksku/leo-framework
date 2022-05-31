#!/bin/bash

cp .gitignore .gitignore-temp

echo 'app/' >> .gitignore
echo 'android/' >> .gitignore
echo 'resources/' >> .gitignore

git --git-dir=.git-framework add -A
git --git-dir=.git-framework commit -m 'Squashed commits'
git --git-dir=.git-framework push

rm .gitignore
mv .gitignore-temp .gitignore
