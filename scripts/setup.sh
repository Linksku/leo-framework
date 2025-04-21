#!/bin/bash

mv .git .git-framework
git init
scripts/helpers/switch-to-app.mjs

cp -r app-template app
cp env/env-template env/env.dev
cp env/secrets-template env/secrets

yarn

npx husky init
echo 'npx lint-staged' > .husky/pre-commit
chmod +x .husky/pre-commit

git add -A && git commit -m "Initial"
