import 'core/initEnv';

// todo: low/mid build shared lib bundle for server scripts
import yargs from 'yargs';

import 'services/knex/knexBT';

if (!process.env.SERVER_SCRIPT_PATH) {
  throw new Error('serverScript: script not found.');
}

if (!process.env.SERVER || !process.env.NODE_ENV) {
  throw new Error('serverScript: env vars not set.');
}

const { default: fn } = await import(
  `../../${process.env.SERVER_SCRIPT_PATH}`
);

let promise: any;
try {
  // todo: low/mid args validation and typing
  // Note: yargs built-in validation allows non-numbers and converts them to NaN
  promise = (fn as AnyFunction)(yargs(process.argv).argv);
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
