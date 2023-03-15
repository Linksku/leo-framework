import chalk from 'chalk';
import dayjs from 'dayjs';

import formatErr from 'utils/formatErr';
import getServerId from 'utils/getServerId';

const MSG_TYPES = new Set(['normal', 'success', 'highlight', 'info', 'warn', 'error', 'fail'] as const);

type MsgType = typeof MSG_TYPES extends Set<infer U> ? U : never;

function printDebug(
  val: any,
  type?: MsgType,
  details?: string,
  printInProd?: 'always' | 'only' | 'never',
): void;

function printDebug(
  val: any,
  details?: string,
): void;

function printDebug(
  val: any,
  _type: any = 'normal',
  _details: string | undefined = undefined,
  _printInProd: 'always' | 'only' | 'never' = 'never',
) {
  if (process.env.PRODUCTION) {
    if (!process.env.IS_SERVER_SCRIPT && _printInProd === 'never') {
      return;
    }
  } else if (_printInProd === 'only') {
    return;
  }

  const type: MsgType = MSG_TYPES.has(_type) ? _type : 'normal';
  const details = MSG_TYPES.has(_type) ? _details : null;

  let msg = formatErr(val);
  if (type === 'success') {
    msg = chalk.green(msg);
  } else if (type === 'highlight' || type === 'info') {
    msg = chalk.cyan(msg);
  } else if (type === 'warn') {
    msg = chalk.yellow(msg);
  } else if (type === 'error' || type === 'fail') {
    msg = chalk.redBright(msg);
  }

  const timeStr = dayjs().format('MM-DD HH:mm:ss');
  const serverId = getServerId();
  if (details) {
    // eslint-disable-next-line no-console
    console.log(`[${timeStr}]${serverId ? `[${serverId}]` : ''} ${msg}:`, details);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[${timeStr}]${serverId ? `[${serverId}]` : ''} ${msg}`);
  }
}

export default printDebug;
