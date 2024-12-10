import promiseTimeout from 'utils/promiseTimeout';
import formatErr from 'utils/formatErr';
import stringify from 'utils/stringify';

const FORCE_STOP_SYMBOL = Symbol('FORCE_STOP');

export function forceStopRetry(err: unknown): {
  FORCE_STOP_SYMBOL: symbol,
  err: unknown,
} {
  return {
    FORCE_STOP_SYMBOL,
    err,
  };
}

export default async function retry<T>(
  fn: (() => Promise<T>) | (() => T),
  {
    times,
    minTime,
    interval = 1000,
    printInterval = 60 * 1000,
    timeout,
    ctx,
  }: {
    times?: number,
    minTime?: number,
    interval?: number,
    printInterval?: number,
    timeout?: number,
    ctx: string,
  }): Promise<T> {
  if (!times) {
    if (timeout) {
      times = 9999;
    } else {
      throw new Error('retry: "timeout" or "times" required');
    }

    if (!process.env.PRODUCTION && minTime) {
      throw new Error('retry: "minTime" requires "times"');
    }
  }

  const startTime = performance.now();
  let lastPrintTime = performance.now();
  let didPrint = false;
  let lastErr: any;
  for (
    let i = 0;
    i < times || (minTime && performance.now() - startTime < minTime);
    i++
  ) {
    let didCurLoopThrow = false;
    try {
      const ret = fn();
      if (ret instanceof Promise) {
        const promise = timeout
          ? promiseTimeout(
            ret,
            {
              timeout: (timeout - (performance.now() - startTime)) * 1.1,
              getErr:
                () => lastErr
                  ?? getErr(`retry(${ctx}): promise timed out`, { ctx, lastErr }),
            },
          )
          : ret;
        // eslint-disable-next-line no-await-in-loop
        return await promise;
      }
      return ret;
    } catch (err) {
      if (TS.isObj(err) && err.FORCE_STOP_SYMBOL === FORCE_STOP_SYMBOL) {
        if (err.err instanceof Error) {
          throw getErr(err.err, { ctx, lastErr });
        }
        throw getErr('retry: force stopped', {
          ctx,
          err: err.err,
          lastErr,
        });
      }

      if (!process.env.PRODUCTION && !(err instanceof Error)) {
        printDebug(`retry(${ctx}): err isn't Error: ${stringify(err)}`, 'warn');
      }

      lastErr = err;
      didCurLoopThrow = true;
    }

    if (i >= times - 1 && (!minTime || performance.now() - startTime >= minTime)) {
      if (didCurLoopThrow && lastErr) {
        if (lastErr instanceof Error) {
          throw getErr(lastErr, { ctx });
        }
        throw lastErr;
      }

      throw getErr('retry: ran max times', { ctx, lastErr });
    }
    if (timeout && performance.now() + interval - startTime >= timeout) {
      if (didCurLoopThrow && lastErr) {
        if (lastErr instanceof Error) {
          throw getErr(lastErr, { ctx });
        }
        throw lastErr;
      }

      throw getErr('retry: timed out', { ctx, lastErr });
    }

    if (performance.now() - lastPrintTime >= printInterval
      && lastErr instanceof Error) {
      printDebug(`Retrying${ctx ? ` (${ctx})` : ''}. Last error:`, 'warn');
      printDebug(formatErr(lastErr, { maxStackLines: didPrint ? 0 : undefined }));
      lastPrintTime = performance.now();
      didPrint = true;
    }

    // eslint-disable-next-line no-await-in-loop
    await pause(interval);
  }

  throw getErr('retry: ran max times', { ctx, lastErr });
}
