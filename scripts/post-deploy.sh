#!/bin/bash
# todo: low/mid if post-deploy.sh was updated, throw error and rerun
set -e

GIT_REVS=$(git rev-list --count master)
if [ -n "$1" ] && [ "$1" != "$GIT_REVS" ]; then
  printf "\033[0;31mLocal and remote git versions don't match."
  exit 1
fi

echo "Yarn"
# Might throw patching errors the first time
yarn || true
yarn

echo "Letsencrypt"
chmod -R 755 /etc/letsencrypt
mkdir -p build/production/web/.well-known/acme-challenge
if ! letsencrypt renew --webroot -w build/production/web; then
  echo "Letsencrypt failed to renew"
fi

echo "Stop monitor-infra"
yarn ss stopMonitorInfra || true

# todo: mid/mid don't delete mz if no models changed
echo "Load Docker"
docker load --input server.tar.gz

echo "Migrations"
rm -f app/pgdumpBT.sql
rm -f app/pgdumpRR.sql
rm -rf node_modules/.build
rm -rf node_modules/.cache
yarn migrate:up

echo "Docker Compose up"
docker stop $(yarn dc ps -q redis) || true
yarn ss startDockerCompose --allowRecreate --no-docker || { echo 'Docker failed to start' ; exit 1; }

# Misc
docker system prune --volumes -f
rm server.tar.gz
