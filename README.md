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
- Node 14+
- Yarn
- Postgres 14+

2. Run in the project root:
```
yarn
yarn app
```

### Set Up Database ###

1. Create a Postgres database.

2. Edit `app/.env` and `app/.env`.

3. Todo

## Developing Locally ##

1. Run `yarn docker`.

2. Run `yarn serve`.

3. Go to `http://localhost:6969`.

## Linting & Testing ##

- Run `yarn lint` to run Eslint and Stylelint.

- Run `yarn tsc` to run TypeScript.

## Deploying to Prod ##

1. Run `yarn deploy`.

## Building Mobile ##

1. Run `npx cap add android` or `npx cap add ios`.

2. Continue in Android Studio or XCode.
