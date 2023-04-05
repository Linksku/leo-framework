#!/bin/bash

cp .gitignore .gitignore-temp

echo '/env' >> .gitignore
echo '/app/' >> .gitignore
echo '/capacitor/android/' >> .gitignore
echo '/capacitor/ios/' >> .gitignore
echo '/capacitor/resources/' >> .gitignore

printf '%s\n\n%s\n' $'This is the public version of my private repo with commits squashed.' "$(cat README.md)" > README.md

git --git-dir=.git-framework add -A
git --git-dir=.git-framework commit -m 'Squashed commits'
git --git-dir=.git-framework push

sed -i 1,2d README.md
rm .gitignore
mv .gitignore-temp .gitignore
