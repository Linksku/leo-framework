#!/bin/bash

cp .gitignore .gitignore-temp

echo '' >> .gitignore
echo '# App-specific' >> .gitignore
echo '/env/*' >> .gitignore
echo '!/env/env-template' >> .gitignore
echo '!/env/secrets-template' >> .gitignore
echo '/app/' >> .gitignore
echo '/capacitor/android/' >> .gitignore
echo '/capacitor/ios/' >> .gitignore
echo '/capacitor/resources/' >> .gitignore
echo '/capacitor/app-store/' >> .gitignore
echo '__generated__' >> .gitignore

printf '%s\n\n%s\n' $'This is the public version of my private repo with commits squashed.' "$(cat README.md)" > README.md

git --git-dir=.git-framework rm --cached `git --git-dir=.git-framework ls-files -i -c --exclude-from=.gitignore`
git --git-dir=.git-framework add -A
git --git-dir=.git-framework commit -m 'Squashed commits'
git --git-dir=.git-framework push

sed -i 1,2d README.md
rm .gitignore
mv .gitignore-temp .gitignore
