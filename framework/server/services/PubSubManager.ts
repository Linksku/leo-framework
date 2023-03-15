import { redisSub, redisPub } from 'services/redis';
import getServerId from 'utils/getServerId';
import { PUB_SUB } from 'consts/coreRedisNamespaces';

type Message = {
  data: string,
  serverId: number,
};

type Cb = (data: string) => void;

const eventTypesToCbs = Object.create(null) as ObjectOf<Set<Cb>>;
const serverId = getServerId();

const PubSubManager = {
  publish(eventType: string, data: string) {
    const msg: Message = {
      data,
      serverId,
    };
    wrapPromise(
      redisPub.publish(
        `${PUB_SUB}:${eventType}`,
        JSON.stringify(msg),
      ),
      'warn',
      `Publish pubsub event ${eventType}`,
    );
  },

  subscribe(
    eventType: string,
    cb: Cb,
  ) {
    if (!eventTypesToCbs[eventType]) {
      eventTypesToCbs[eventType] = new Set();
      wrapPromise(
        redisSub.subscribe(`${PUB_SUB}:${eventType}`),
        'warn',
        `Subscribe pubsub event ${eventType}`,
      );
    }

    TS.defined(eventTypesToCbs[eventType]).add(cb);
  },

  unsubscribe(
    eventType: string,
    cb: Cb,
  ) {
    const cbs = eventTypesToCbs[eventType];
    if (!cbs) {
      return;
    }

    cbs.delete(cb);
    if (!cbs.size) {
      delete eventTypesToCbs[eventType];
      wrapPromise(
        redisSub.unsubscribe(`${PUB_SUB}:${eventType}`),
        'warn',
        `Unsubscribe pubsub event ${eventType}`,
      );
    }
  },

  unsubscribeAll(eventType: string) {
    delete eventTypesToCbs[eventType];
    wrapPromise(
      redisSub.unsubscribe(`${PUB_SUB}:${eventType}`),
      'warn',
      `Unsubscribe all pubsub event ${eventType}`,
    );
  },

  handleMessage(this: void, channel: string, msgStr: string) {
    if (!channel.startsWith(`${PUB_SUB}:`)) {
      return;
    }

    const eventType = channel.slice(PUB_SUB.length + 1);
    let msg: Message;
    try {
      msg = JSON.parse(msgStr);
    } catch {
      ErrorLogger.error(
        new Error(`PubSubManager.handleMessage(${channel}): msg isn't JSON`),
        { msgStr },
      );
      return;
    }

    const cbs = eventTypesToCbs[eventType];
    if (msg.serverId !== serverId && cbs) {
      for (const cb of cbs) {
        cb(msg.data);
      }
    }
  },
};

redisSub.on('message', PubSubManager.handleMessage);

export default PubSubManager;
