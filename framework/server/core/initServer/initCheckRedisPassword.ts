import { REDIS_USER } from 'consts/infra';
import redis from 'services/redis';

export default async function initCheckRedisPassword() {
  try {
    const data: string[] | string[][] | null = await redis.acl('GETUSER', REDIS_USER);
    if (!data) {
      throw new Error('initCheckRedisPassword: GETUSER failed');
    }
    const passIdx = data.indexOf('passwords');
    if (passIdx < 0) {
      throw new Error('initCheckRedisPassword: no passwords');
    }

    const passwords = data[passIdx + 1];
    if (!passwords || !Array.isArray(passwords) || !passwords.length) {
      throw new Error('initCheckRedisPassword: no password set');
    }
  } catch (err) {
    if (!process.env.PRODUCTION && err instanceof Error && err.message.includes('timed out')) {
      ErrorLogger.warn(err, { ctx: 'initCheckRedisPassword' });
    } else {
      throw err;
    }
  }
}
