#!/bin/bash

mv .git .git-framework
git init
scripts/helpers/switch-to-app.sh

cp -r app-template app
cp env/env-template env/env.dev
cp env/secrets-template env/secrets

git add -A && git commit -m "Initial"
