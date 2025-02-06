#!/bin/bash

cp .gitignore .gitignore-temp

echo '' >> .gitignore
echo '# App-specific' >> .gitignore
echo '/.git-crypt/*' >> .gitignore
echo '/env/*' >> .gitignore
echo '!/env/env-template' >> .gitignore
echo '!/env/secrets-template' >> .gitignore
echo '/.sentryclirc' >> .gitignore
echo '/app/' >> .gitignore
echo '/capacitor/android/' >> .gitignore
echo '/capacitor/ios/' >> .gitignore
echo '/capacitor/resources/' >> .gitignore
echo '/capacitor/app-store/' >> .gitignore
echo '__generated__' >> .gitignore

printf '%s\n\n%s\n' $'This is the public version of my private repo with commits squashed.' "$(cat README.md)" > README.md
