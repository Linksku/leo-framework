import type { Lock } from 'redlock';
import { ExecutionError } from 'redlock';
import { AsyncLocalStorage } from 'async_hooks';

import redlock from 'services/redlock';
import redis from 'services/redis';

export type RedlockContext = {
  lockNames: Set<string>,
};

const RedlockContextLocalStorage = new AsyncLocalStorage<RedlockContext>();

export default async function usingRedlock(
  lockName: string,
  timeout: number,
  cb: (acquiredNewLock: boolean) => Promise<void>,
) {
  const redlockContext = RedlockContextLocalStorage.getStore();
  if (redlockContext?.lockNames.has(lockName)) {
    await cb(false);
    return;
  }

  let lock: Lock;
  let timer: NodeJS.Timeout | undefined;
  let extendingPromise: Promise<void> | undefined;

  function queueExtendLock() {
    timer = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      extendingPromise = extendLock();
    }, lock.expiration - Date.now() - 500);
  }

  // Mostly copied from node-redlock
  async function extendLock() {
    try {
      lock = await lock.extend(timeout);
      queueExtendLock();
    } catch (_err) {
      if (lock.expiration > Date.now()) {
        extendingPromise = extendLock();
        return;
      }

      let err = _err;
      if (err instanceof Error && err.message.includes('Cannot extend an already-expired lock')) {
        try {
          lock = await redlock.acquire([lockName], timeout);
        } catch (err2) {
          err = err2;
        }

        queueExtendLock();
        return;
      }

      ErrorLogger.fatal(err, {
        ctx: `usingRedlock: lock "${lockName}" aborted`,
      })
        .catch(() => {
          // eslint-disable-next-line unicorn/no-process-exit
          process.exit(1);
        });
    }
  }

  // todo: mid/mid free lock before exiting
  try {
    lock = await redlock.acquire([lockName], timeout);
  } catch (err) {
    if (!(err instanceof ExecutionError)
      || !err.message.includes('The operation was unable to achieve a quorum during its retry window')) {
      throw err;
    }

    let res: any;
    try {
      res = await redis.ping();
    } catch {}
    throw new Error(
      res === 'PONG'
        ? `usingRedlock(${lockName}): failed to acquire lock`
        : `usingRedlock(${lockName}): Redis unavailable`,
    );
  }

  queueExtendLock();

  let lastErr: unknown;
  try {
    if (redlockContext) {
      redlockContext.lockNames.add(lockName);
      await cb(true);
      redlockContext.lockNames.delete(lockName);
    } else {
      await RedlockContextLocalStorage.run(
        {
          lockNames: new Set([lockName]),
        },
        () => cb(true),
      );
    }
  } catch (err) {
    lastErr = err;
  }

  if (timer) {
    clearTimeout(timer);
  }
  if (extendingPromise) {
    await extendingPromise.catch(NOOP);
  }
  await lock.release();

  if (lastErr) {
    throw lastErr;
  }
}
