import { inspect } from 'util';
import chalk from 'chalk';
import yargs from 'yargs';

import 'lib/initDotenv';
import 'services/knex';

if (!process.env.SCRIPT_PATH) {
  throw new Error('Script not found.');
}

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('Env vars not set.');
}

const fn = (await import(`../../${process.env.SCRIPT_PATH}`)).default;

let promise: any;
try {
  promise = fn(yargs(process.argv).argv);
} catch (err) {
  console.log(chalk.redBright.bold(err.message));
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
    .catch((err: Error) => {
      console.log(chalk.redBright.bold(err.message));
      console.log(inspect(err, { depth: 10 }));
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    });
} else {
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(0);
}
