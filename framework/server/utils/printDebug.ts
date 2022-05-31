import { inspect } from 'util';
import chalk from 'chalk';

const MSG_TYPES = new Set(['normal', 'success', 'highlight', 'info', 'warn', 'error', 'fail'] as const);

type MsgType = typeof MSG_TYPES extends Set<infer U> ? U : never;

function printDebug(
  val: any,
  type?: MsgType,
  details?: string,
): void;

function printDebug(
  val: any,
  details?: string,
): void;

function printDebug(
  val: any,
  _type: any = 'normal',
  _details: string | undefined = undefined,
) {
  const type: MsgType = MSG_TYPES.has(_type) ? _type : 'normal';
  const details = MSG_TYPES.has(_type) ? _details : null;

  let msg: string;
  if (val instanceof Error) {
    msg = `${val.message}
${inspect(val, { depth: 10 })}`;
  } else if (val && typeof val === 'object') {
    msg = inspect(val, { depth: 10 });
  } else {
    msg = `${val}`;
  }

  if (type === 'success') {
    msg = chalk.green(msg);
  } else if (type === 'highlight' || type === 'info') {
    msg = chalk.cyan(msg);
  } else if (type === 'warn') {
    msg = chalk.yellow(msg);
  } else if (type === 'error' || type === 'fail') {
    msg = chalk.redBright(msg);
  }

  if (details) {
    // eslint-disable-next-line no-console
    console.log(`${msg}:`, details);
  } else {
    // eslint-disable-next-line no-console
    console.log(msg);
  }
}

export default process.env.PRODUCTION && !process.env.IS_SERVER_SCRIPT
  ? NOOP as typeof printDebug
  : printDebug;
