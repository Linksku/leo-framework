import { redisSub, redisPub } from 'services/redis';
import getServerId from 'lib/getServerId';

type Message = {
  data: string,
  serverId: number,
};

type Cb = (data: string) => void;

const REDIS_EVENT_NAME = 'PubSubManager:';

const eventTypesToCbs = Object.create(null) as ObjectOf<Set<Cb>>;
const serverId = getServerId();

const PubSubManager = {
  publish(eventType: string, data: string) {
    const message: Message = {
      data,
      serverId,
    };
    void wrapPromise(
      redisPub.publish(
        `${REDIS_EVENT_NAME}${eventType}`,
        JSON.stringify(message),
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
      void wrapPromise(
        redisSub.subscribe(`${REDIS_EVENT_NAME}${eventType}`),
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
      void wrapPromise(
        redisSub.unsubscribe(`${REDIS_EVENT_NAME}${eventType}`),
        'warn',
        `Unsubscribe pubsub event ${eventType}`,
      );
    }
  },

  unsubscribeAll(eventType: string) {
    delete eventTypesToCbs[eventType];
    void wrapPromise(
      redisSub.unsubscribe(`${REDIS_EVENT_NAME}${eventType}`),
      'warn',
      `Unsubscribe all pubsub event ${eventType}`,
    );
  },

  handleMessage(this: void, channel: string, messageStr: string) {
    if (!channel.startsWith(REDIS_EVENT_NAME)) {
      return;
    }

    const eventType = channel.slice(REDIS_EVENT_NAME.length);
    let message: Message;
    try {
      message = JSON.parse(messageStr);
    } catch {
      return;
    }

    const cbs = eventTypesToCbs[eventType];
    if (message.serverId !== serverId && cbs) {
      for (const cb of cbs) {
        cb(message.data);
      }
    }
  },
};

redisSub.on('message', PubSubManager.handleMessage);

export default PubSubManager;
