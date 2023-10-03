import chalk from 'chalk';
import dayjs from 'dayjs';

import formatErr from 'utils/formatErr';
import getServerId from 'utils/getServerId';

const MSG_TYPES = new Set(['normal', 'success', 'highlight', 'info', 'warn', 'error', 'fail'] as const);

const MSG_TYPE_TO_COLOR = TS.literal({
  normal: 'reset',
  success: 'green',
  highlight: 'cyan',
  info: 'cyan',
  warn: 'yellow',
  error: 'redBright',
  fail: 'redBright',
} as const);

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
  const firstNewLine = msg.indexOf('\n');
  const color = MSG_TYPE_TO_COLOR[type];
  msg = firstNewLine >= 0
    ? `${chalk[color](msg.slice(0, firstNewLine))}\n${msg.slice(firstNewLine + 1)}`
    : chalk[color](msg);

  const timeStr = dayjs().format('MM-DD HH:mm:ss');
  const serverId = getServerId();
  const prefix = `[${timeStr}]${serverId ? `[${serverId}]` : ''}${ctx ? ` ${ctx}:` : ''}`;
  if (details) {
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${msg}:`, details);
  } else {
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${msg}`);
  }
}
