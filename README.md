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
- Redis 5+
- Materialize 0.14+

2. Run:

```
yarn
yarn app
```

## Developing Locally ##

1. Run `yarn serve`.

2. Go to `http://localhost:6969`.

## Linting & Testing ##

- Run `yarn lint` to run Eslint and Stylelint.

- Run `yarn tsc` to run TypeScript.

## Deploying to Prod ##

1. Run `yarn deploy`.

## Building Mobile ##

1. Run `npx cap add android` or `npx cap add ios`.

2. Continue in Android Studio or XCode.
