import { redisSub, redisPub } from 'services/redis';
import getServerId from 'lib/getServerId';

type Message = {
  data: string,
  serverId: number,
};

type Cb = (data: string) => void;

const REDIS_EVENT_NAME = 'PubSubManager:';

const eventTypesToCb = Object.create(null) as ObjectOf<Set<Cb>>;
const serverId = getServerId();

const PubSubManager = {
  publish(eventType: string, data: string) {
    const message: Message = {
      data,
      serverId,
    };
    redisPub.publish(
      `${REDIS_EVENT_NAME}${eventType}`,
      JSON.stringify(message),
    );
  },

  subscribe(
    eventType: string,
    cb: Cb,
  ) {
    if (!eventTypesToCb[eventType]) {
      eventTypesToCb[eventType] = new Set();
      redisSub.subscribe(`${REDIS_EVENT_NAME}${eventType}`);
    }
    eventTypesToCb[eventType].add(cb);
  },

  unsubscribe(
    eventType: string,
    cb: Cb,
  ) {
    if (eventTypesToCb[eventType]) {
      eventTypesToCb[eventType].delete(cb);
    }
    if (!eventTypesToCb[eventType].size) {
      delete eventTypesToCb[eventType];
      redisSub.unsubscribe(`${REDIS_EVENT_NAME}${eventType}`);
    }
  },

  unsubscribeAll(eventType: string) {
    delete eventTypesToCb[eventType];
    redisSub.unsubscribe(`${REDIS_EVENT_NAME}${eventType}`);
  },

  handleMessage(channel: string, messageStr: string) {
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

    if (message.serverId !== serverId && eventTypesToCb[eventType]) {
      for (const cb of eventTypesToCb[eventType]) {
        cb(message.data);
      }
    }
  },
};

redisSub.on('message', PubSubManager.handleMessage);

export default PubSubManager;
