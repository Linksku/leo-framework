import chalk from 'chalk';
import dayjs from 'dayjs';

import formatErr from 'utils/formatErr';
import getServerId from 'utils/getServerId';

const MSG_TYPES = new Set(['normal', 'success', 'highlight', 'info', 'warn', 'error', 'fail'] as const);

type MsgType = typeof MSG_TYPES extends Set<infer U> ? U : never;

export default function printDebug(
  val: any,
  type: MsgType = 'normal',
  { details, ctx, prod = 'never' }: {
    details?: string,
    ctx?: string,
    prod?: 'always' | 'only' | 'never',
  } = {},
) {
  if (process.env.PRODUCTION) {
    if (!process.env.IS_SERVER_SCRIPT && prod === 'never') {
      return;
    }
  } else if (prod === 'only') {
    return;
  }

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

  // todo: mid/mid date seems to go back sometimes
  const timeStr = dayjs().format('MM-DD HH:mm:ss');
  const serverId = getServerId();
  const prefix = `[${timeStr}]${serverId ? `[${serverId}]` : ''}`;
  if (details) {
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${msg}${ctx ? ` (${ctx})` : ''}:`, details);
  } else {
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${msg}${ctx ? ` (${ctx})` : ''}`);
  }
}
