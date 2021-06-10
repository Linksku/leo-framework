## Setup Repo ##

1. Clone this repo

2. Run:

```
mv .git .git-framework
git init
cp src-template src
```

## Installation ##

1. Install:
- Node 12+
- Yarn
- MySQL 8+
- Redis 5+

2. Run:

```
yarn
yarn src
```

## Developing Locally ##

1. Run `yarn serve`.

2. Go to `http://localhost:6969`.

## Linting & Testing ##

- Run `yarn lint` to run Eslint and Stylelint.

- Run `yarn tsc` to run TypeScript.

## Deploying to Prod ##

1. Run `yarn deploy`.
