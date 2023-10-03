#!/bin/bash
# todo: low/mid if post-deploy.sh was updated, throw error and rerun
set -e
set -o allexport; source ./env; set +o allexport

GIT_REVS=$(git rev-list --count master)
if [ "$1" != "$GIT_REVS" ]; then
  printf "\033[0;31mLocal and remote git versions don't match."
  exit 1
fi

docker stop server || true
docker stop monitor-infra || true
docker stop redis || true
docker rm server || true
docker rm monitor-infra || true
docker rmi -f server || true
docker system prune -f

docker load --input build.tar
rm build.tar

yarn
yarn dc restart server-script
chmod -R 755 /etc/letsencrypt
letsencrypt renew
yarn dc --compatibility up -d --remove-orphans --no-recreate \
  --scale server=0 --scale monitor-infra=0

rm app/pgdumpBT.sql
rm app/pgdumpRR.sql
yarn migrate:up
yarn dc --compatibility up -d --remove-orphans --no-recreate
