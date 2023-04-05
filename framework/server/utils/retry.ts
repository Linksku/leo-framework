import promiseTimeout from 'utils/promiseTimeout';
import formatErr from 'utils/formatErr';

export default async function retry(
  fn: (() => void) | (() => Promise<void>),
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
  }) {
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
    i < times || !minTime || performance.now() - startTime < minTime;
    i++
  ) {
    let didCurLoopThrow = false;
    try {
      const ret = fn();
      if (ret instanceof Promise) {
        const promise = timeout
          ? promiseTimeout(
            ret,
            (timeout - (performance.now() - startTime)) * 1.1,
            getErr('retry: promise timed out', { ctx, lastErr }),
          )
          : ret;
        // eslint-disable-next-line no-await-in-loop
        await promise;
      }
      return;
    } catch (err) {
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
}
