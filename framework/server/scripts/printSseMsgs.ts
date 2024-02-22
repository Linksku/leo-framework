import chalk from 'chalk';
import { inspect } from 'util';

import type { PubSubMessage } from 'services/PubSubManager';
import { PUB_SUB } from 'consts/coreRedisNamespaces';
import { redisSub } from 'services/redis';
import { unserializeSseEvent } from 'utils/serializeSseEvent';

export default async function printSseMsgs() {
  redisSub.on('pmessage', (_channel: string, _pattern: string, msgStr: string) => {
    const msg: PubSubMessage = JSON.parse(msgStr);
    const { eventType, ...data }: SseResponse = JSON.parse(msg.data);
    const { name, params } = unserializeSseEvent(eventType);
    console.log(
      `[${msg.serverId}]`,
      chalk.bold(`${name} ${inspect(params)}:`),
      inspect(data.data, { breakLength: Number.POSITIVE_INFINITY }),
    );
  });

  await redisSub.psubscribe(`${PUB_SUB}:sse:*`);

  await pause(60 * 60 * 1000);
}
