import { inspect } from 'util';
import dotenv from 'dotenv';
import chalk from 'chalk';

if (!process.env.SCRIPT_PATH) {
  throw new Error('Script not found.');
}

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('Env vars not set.');
}

dotenv.config({
  path: 'src/.env',
});

require('services/knex');

// eslint-disable-next-line import/no-dynamic-require
const fn = require(`../../${process.env.SCRIPT_PATH}`).default;

let promise;
try {
  promise = fn();
} catch (err) {
  console.log(inspect(err, { depth: 10 }));
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}

if (promise && promise.then) {
  promise
    .then(() => {
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(0);
    })
    .catch(err => {
      console.log(chalk.redBright.bold(err.message));
      console.log(inspect(err, { depth: 10 }));
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    });
} else {
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(0);
}
