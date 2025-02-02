import 'core/initEnv';

// todo: low/mid build shared lib bundle for server scripts
import yargs from 'yargs';

import 'services/knex/knexBT';

if (!process.env.SERVER_SCRIPT_PATH
  || !process.env.SERVER_SCRIPT_PATH.includes('/scripts/')) {
  throw new Error('serverScript: script not found.');
}

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('serverScript: env vars not set.');
}

let fn: AnyFunction;
try {
  //
  // eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-require-imports
  const module: { default: AnyFunction } = require(
  `../../${process.env.SERVER_SCRIPT_PATH}`,
  );
  fn = module.default;
} catch (err) {
  printDebug(getErr(err, { ctx: `serverScript (${process.env.SERVER_SCRIPT_PATH})` }), 'error');
  await ErrorLogger.flushAndExit(1);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}

let promise: any;
try {
  // todo: low/mid args validation and typing
  // Note: yargs built-in validation allows non-numbers and converts them to NaN
  promise = fn(yargs(process.argv).argv);
} catch (err) {
  printDebug(getErr(err, { ctx: `serverScript (${process.env.SERVER_SCRIPT_PATH})` }), 'error');
  await ErrorLogger.flushAndExit(1);
}

if (TS.isObj(promise) && promise instanceof Promise) {
  // Node bug: prevent exiting while promises are running
  setTimeout(NOOP, 24 * 60 * 60 * 1000);

  try {
    await promise;
    await ErrorLogger.flushAndExit(0);
  } catch (err) {
    printDebug(getErr(err, { ctx: `serverScript (${process.env.SERVER_SCRIPT_PATH})` }), 'error');
    await ErrorLogger.flushAndExit(1);
  }
}

await ErrorLogger.flushAndExit(0);
