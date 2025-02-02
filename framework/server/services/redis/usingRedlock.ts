import { AsyncLocalStorage } from 'async_hooks';
import type { Lock } from 'redlock';
import { ExecutionError } from 'redlock';

import redlock from 'services/redis/redlock';
import redis from 'services/redis';
import promiseTimeout from 'utils/promiseTimeout';
import retry from 'utils/retry';

export type RedlockContext = {
  lockNames: Set<string>,
};

const RedlockContextLocalStorage = new AsyncLocalStorage<RedlockContext>();

export default async function usingRedlock(
  lockName: string,
  cb: (acquiredNewLock: boolean) => Promise<void>,
  {
    duration,
    acquireTimeout = 5000,
  }: {
    duration: number,
    acquireTimeout?: number,
  },
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
      lock = await lock.extend(duration);
      queueExtendLock();
    } catch (_err) {
      if (lock.expiration > Date.now()) {
        extendingPromise = extendLock();
        return;
      }

      let err = _err;
      if (err instanceof Error && err.message.includes('Cannot extend an already-expired lock')) {
        try {
          lock = await promiseTimeout(
            redlock.acquire([lockName], duration),
            {
              timeout: 5000,
              getErr: () => new Error(`usingRedlock(${lockName}): timed out acquiring lock`),
            },
          );
        } catch (err2) {
          ErrorLogger.warn(err2, {
            ctx: `usingRedlock(${lockName})`,
          });
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

  try {
    lock = await retry(
      async () => promiseTimeout(
        redlock.acquire([lockName], duration),
        {
          timeout: acquireTimeout,
          getErr: () => new Error(`usingRedlock(${lockName}): timed out acquiring lock`),
        },
      ),
      {
        timeout: acquireTimeout * 2,
        interval: 1000,
        ctx: `usingRedlock(${lockName})`,
      },
    );
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

  const handleBeforeExit = () => promiseTimeout(
    lock.release(),
    {
      timeout: 5000,
      getErr: () => new Error(`usingRedlock(${lockName}): timed out releasing lock`),
    },
  )
    .finally(() => {
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    });
  const handleExit = () => {
    handleBeforeExit()
      .catch(err => {
        printDebug(err);
      });
  };
  process.on('beforeExit', handleBeforeExit);
  for (const event of ['exit', 'SIGINT', 'SIGTERM']) {
    process.on(event, handleExit);
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

  process.off('beforeExit', handleBeforeExit);
  for (const event of ['exit', 'SIGINT', 'SIGTERM']) {
    process.off(event, handleExit);
  }

  if (lastErr) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw lastErr;
  }
}
