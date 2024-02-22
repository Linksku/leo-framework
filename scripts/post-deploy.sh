#!/bin/bash
# todo: low/mid if post-deploy.sh was updated, throw error and rerun
set -e

GIT_REVS=$(git rev-list --count master)
if [ "$1" != "$GIT_REVS" ]; then
  printf "\033[0;31mLocal and remote git versions don't match."
  exit 1
fi

echo "Remove containers"
docker stop $(yarn dc ps -q monitor-infra) || true
docker rm $(yarn dc ps -q monitor-infra) || true
docker stop $(yarn dc ps -q server) || true
docker rm $(yarn dc ps -q server) || true
docker rmi -f $(yarn dc ps -q server) || true
docker stop $(yarn dc ps -q redis) || true

docker system prune --volumes -f

echo "Letsencrypt"
chmod -R 755 /etc/letsencrypt
letsencrypt renew

# todo: mid/mid don't delete mz if no models changed
echo "Load Docker"
docker load --input server.tar.gz
rm server.tar.gz

echo "Yarn"
yarn
yarn dc restart server-script

echo "Docker Compose"
yarn dc --compatibility up -d --remove-orphans \
  --scale server=0 --scale monitor-infra=0

echo "Migrations"
rm app/pgdumpBT.sql
rm app/pgdumpRR.sql
yarn migrate:up

echo "Server"
yarn dc --compatibility up -d --remove-orphans
yarn ss waitForDockerHealthy || { echo 'Docker failed to start' ; exit 1; }
