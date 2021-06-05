import Redis from 'ioredis';

export const redisSub = new Redis();
redisSub.on('error', err => {
  console.error(err.message);
});

export const redisPub = new Redis();
redisPub.on('error', err => {
  console.error(err.message);
});

export default new Redis();
