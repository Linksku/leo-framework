import yargs from 'yargs';

import 'lib/initDotenv';
import 'services/knex/knexBT';

if (!process.env.SCRIPT_PATH) {
  throw new Error('Script not found.');
}

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('Env vars not set.');
}

const { default: fn } = await import(`../../../${process.env.SCRIPT_PATH}`);

let promise: any;
try {
  promise = fn(yargs(process.argv).argv);
} catch (err) {
  printDebug(err, 'error');
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
      printDebug(err, 'error');
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    });
} else {
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(0);
}