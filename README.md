This is the core of my private repo (without app-specific code) with commits squashed. [Infra diagram](https://github.com/Linksku/leo-framework/blob/master/framework/infra/infra.png)

## Set Up New App ##

1. Clone this repo

2. In the project root, run:
```
scripts/setup.sh
```

3. Set up git-crypt, add team members if needed

## Installation ##

1. Install:
- Node 22+
- Yarn
- Postgres 16+
- PostGIS 3+
- Docker
- git-crypt
- redis-cli
- sentry-cli
- libvips

2. Run:
```
corepack enable
yarn set version stable
yarn install
sudo npm i -g zx
yarn build:types
```

3. Edit:
- env/env.dev
- app/shared/config/config.js
- app/server/config/serverConfig.ts

### Decrypt Secrets ###

1. Generate and export GPG key:
```
gpg2 --expert --full-gen-key
# Prefer ECC, Curve 25519, no expiry
gpg --output ./pub.gpg --armor --export user@example.com
```

2. Send this public key to someone with the decrypted secrets

3. The person with the decrypted secrets runs:
```
gpg --import ./pub.gpg
gpg --edit-key user@example.com
# gpg> sign
# gpg> save
git-crypt add-gpg-user --trusted user@example.com
git push
```

4. Run:
```
git pull
git-crypt unlock
```

### Set Up Database ###

1. Add to pg_hba.conf:
```
host  all  all  0.0.0.0/0  scram-sha-256
host  all  all  ::/0  scram-sha-256
```

2. Enable SSL:
```
cd /etc/postgresql/xx/main
openssl genrsa -aes128 2048 > server.key
openssl rsa -in server.key -out server.key
chmod 400 server.key
chown postgres:postgres server.key
openssl req -new -key server.key -days 365 -out server.crt -x509
```

3. Uncomment and edit postgresql.conf:
```
ssl = on
max_connections = 200
wal_level = logical
wal_writer_delay = 50ms
max_wal_size = 4GB
max_wal_senders = 100
max_replication_slots = 100
```

For prod:
```
listen_addresses = '*'
``````

4. Restart Postgres.

5. Create Postgres databases.

5.1. If using materialized views, create 2 Postgres databases: writeable base table and read-replica:
```
sudo -u postgres psql
> ALTER USER postgres PASSWORD 'pass';
> CREATE DATABASE db;
> CREATE DATABASE "dbRR";
> \c "dbRR"
> CREATE EXTENSION postgis;
> CREATE EXTENSION tsm_system_rows;
```

5.2. If not using materialized views, create only the base table:
```
sudo -u postgres psql
> ALTER USER postgres PASSWORD 'pass';
> CREATE DATABASE db;
> \c "db"
> CREATE EXTENSION postgis;
> CREATE EXTENSION tsm_system_rows;
```

6. Edit `env/env.dev`.

7. Run `yarn ss recreateInfra`

## Developing Locally ##

1. Run `yarn docker`.

2. Run `yarn serve`.

3. Go to `http://localhost:9001`.

## Linting & Testing ##

- Run `yarn lint` to run Eslint and Stylelint.

- Run `yarn tsc` to run TypeScript.

- Run `yarn test` to run Cypress.

## Set Up or Change Domain ##

1. Add domain to config.js

2. Rebuild app

3. Add to Google API Credentials, Apple Services ID, Facebook/Instagram app

## Deploying to Prod ##

1. Run `yarn deploy`.

## Building Mobile ##

1. Run `npx cap add android` or `npx cap add ios`.

2. Continue in Android Studio or XCode.
