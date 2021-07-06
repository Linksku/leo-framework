#!/bin/bash

cp .gitignore .gitignore-temp

echo 'src/' >> .gitignore
echo 'android/' >> .gitignore
echo 'resources/' >> .gitignore

git --git-dir=.git-framework add -A
git --git-dir=.git-framework commit -m 'Squashed commits'
git --git-dir=.git-framework push

rm .gitignore
mv .gitignore-temp .gitignore
