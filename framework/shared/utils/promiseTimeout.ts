const TIMED_OUT = Symbol('TIMED_OUT');

export default async function promiseTimeout<T extends Promise<any>>(
  promise: T,
  {
    timeout,
    getErr,
    defaultVal,
  }: {
    timeout: number,
    getErr?: () => Error,
    defaultVal?: any,
  },
): Promise<Awaited<T>> {
  if (timeout <= 0) {
    if (getErr) {
      throw getErr();
    }
    return defaultVal;
  }

  const result = await Promise.race([
    promise,
    new Promise<typeof TIMED_OUT>(succ => {
      setTimeout(() => {
        succ(TIMED_OUT);
      }, timeout);
    }),
  ]);

  if (result === TIMED_OUT) {
    if (getErr) {
      throw getErr();
    }
    return defaultVal;
  }

  return result;
}
