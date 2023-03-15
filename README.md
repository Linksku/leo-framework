This is the public version of my private repo with commits squashed.

## Setup Repo ##

1. Clone this repo

2. Run:
```
mv .git .git-framework
git init
cp app-template app
```

## Installation ##

1. Install:
- Node 16+
- Yarn
- Postgres 15+
- PostGIS 3+
- Docker

2. Run in the project root:
```
yarn
yarn app
```

### Set Up Database ###

1. Create 2 Postgres databases: normal and read-replica.

2. Edit `env` and `.env`.

3. Add to pg_hba.conf
```
host  all  all  0.0.0.0/0  scram-sha-256
```

4. Add to postgresql.conf:
```
listen_addresses = '*'
wal_level = logical
wal_writer_delay = 10ms
max_wal_senders = 100
max_replication_slots = 100
```

5. Run `yarn ss db/recreateInfra`

## Developing Locally ##

1. Run `yarn docker`.

2. Run `yarn serve`.

3. Go to `http://localhost:6969`.

## Linting & Testing ##

- Run `yarn lint` to run Eslint and Stylelint.

- Run `yarn tsc` to run TypeScript.

- Run `yarn test` to run Cypress.

## Deploying to Prod ##

1. Run `yarn deploy`.

## Building Mobile ##

1. Run `cd capacitor && npx cap add android` or `cd capacitor && npx cap add ios`.

2. Continue in Android Studio or XCode.
