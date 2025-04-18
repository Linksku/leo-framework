import { redisSub, redisPub } from 'services/redis';
import getServerId from 'utils/getServerId';
import { PUB_SUB } from 'consts/coreRedisNamespaces';
import safeParseJson from 'utils/safeParseJson';
import fastJson from 'services/fastJson';
import isSecondaryServer from 'utils/isSecondaryServer';

const stringifyMsg = fastJson({
  type: 'object',
  properties: {
    data: { type: 'string' },
    serverId: { type: 'number' },
  },
});

export type PubSubMessage = {
  data: string,
  serverId: number,
};

type Cb = (data: string) => void;

const eventTypesToCbs = new Map<string, Set<Cb>>();
const serverId = getServerId();

function printEventType(ctx: string, eventType: string) {
  if (!process.env.PRODUCTION
    && !eventType.startsWith('HealthcheckManager.')) {
    const rc = getRC();
    if (!rc || rc.debug) {
      printDebug(ctx, 'highlight', { details: eventType });
    }
  }
}

const PubSubManager = {
  publish(eventType: string, data: string): void {
    printEventType('PubSub.publish', eventType);

    const msg: PubSubMessage = {
      data,
      serverId,
    };
    wrapPromise(
      redisPub.publish(
        `${PUB_SUB}:${eventType}`,
        stringifyMsg(msg),
      ),
      'warn',
      `Publish pubsub event ${eventType}`,
    );
  },

  subscribe(
    eventType: string,
    cb: Cb,
  ): void {
    printEventType('PubSub.subscribe', eventType);

    if (!eventTypesToCbs.has(eventType)) {
      eventTypesToCbs.set(eventType, new Set());
      wrapPromise(
        redisSub.subscribe(`${PUB_SUB}:${eventType}`),
        'warn',
        `Subscribe pubsub event ${eventType}`,
      );
    }

    (eventTypesToCbs.get(eventType) as Set<Cb>).add(cb);
  },

  unsubscribe(
    eventType: string,
    cb: Cb,
  ): void {
    const cbs = eventTypesToCbs.get(eventType);
    if (!cbs) {
      return;
    }

    cbs.delete(cb);
    if (!cbs.size) {
      eventTypesToCbs.delete(eventType);
      wrapPromise(
        redisSub.unsubscribe(`${PUB_SUB}:${eventType}`),
        'warn',
        `Unsubscribe pubsub event ${eventType}`,
      );
    }
  },

  unsubscribeAll(eventType: string): void {
    eventTypesToCbs.delete(eventType);
    wrapPromise(
      redisSub.unsubscribe(`${PUB_SUB}:${eventType}`),
      'warn',
      `Unsubscribe all pubsub event ${eventType}`,
    );
  },

  handleMessage(this: void, channel: string, msgStr: string): void {
    if (!channel.startsWith(`${PUB_SUB}:`)) {
      return;
    }

    const eventType = channel.slice(PUB_SUB.length + 1);
    const msg = safeParseJson<PubSubMessage>(msgStr);
    if (!msg) {
      ErrorLogger.error(
        new Error(`PubSubManager.handleMessage(${channel}): invalid msg`),
        { msgStr },
      );
      return;
    }
    if (msg.serverId === serverId) {
      return;
    }

    printEventType('PubSub.handleMessage', eventType);

    const cbs = eventTypesToCbs.get(eventType);
    if (cbs) {
      for (const cb of cbs) {
        cb(msg.data);
      }
    }
  },
};

if (isSecondaryServer) {
  setTimeout(() => {
    redisSub.on('message', PubSubManager.handleMessage);
  }, 0);
}

export default PubSubManager;
