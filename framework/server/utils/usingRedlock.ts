import { ExecutionError } from 'redlock';

import redlock from 'services/redlock';
import { AsyncLocalStorage } from 'async_hooks';

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

  try {
    // todo: mid/easy free lock before exiting
    await redlock.using([lockName], timeout, async signal => {
      signal.addEventListener('abort', () => {
        ErrorLogger.fatal(signal.error, {
          ctx: `usingRedlock: lock "${lockName}" aborted`,
        })
          .catch(() => {
            // eslint-disable-next-line unicorn/no-process-exit
            process.exit(1);
          });
      });

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
    });
  } catch (err) {
    if (err instanceof ExecutionError
      && err.message.includes('The operation was unable to achieve a quorum during its retry window')) {
      throw new Error(`usingRedlock(${lockName}): failed to acquire lock`);
    }
    throw err;
  }
}
