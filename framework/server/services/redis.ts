import Redis from 'ioredis';

export const redisSub = new Redis();
redisSub.on('error', err => {
  ErrorLogger.warn(err, 'redisSub error');
});

export const redisPub = new Redis();
redisPub.on('error', err => {
  ErrorLogger.warn(err, 'redisPub error');
});

export default new Redis();
