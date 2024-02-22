import { REDIS_USER } from 'consts/infra';
import redis from 'services/redis';

export default async function initCheckRedisPass() {
  const data: string[] | string[][] | null = await redis.acl('GETUSER', REDIS_USER);
  if (!data) {
    throw new Error('initCheckRedisPass: GETUSER failed');
  }
  const passIdx = data.indexOf('passwords');
  if (passIdx < 0) {
    throw new Error('initCheckRedisPass: no passwords');
  }

  const passwords = data[passIdx + 1];
  if (!passwords || !Array.isArray(passwords) || !passwords.length) {
    throw new Error('initCheckRedisPass: no password set');
  }
}
