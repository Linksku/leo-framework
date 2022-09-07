export default async function retry(
  fn: (() => boolean) | (() => Promise<boolean>),
  {
    times,
    interval = 1000,
    timeout,
    err,
  }: {
    times?: number,
    interval?: number,
    timeout?: number,
    err: string | (() => string),
  }) {
  if (!times) {
    if (timeout) {
      times = 9999;
    } else {
      throw new Error('retry: timeout or times required');
    }
  }

  const startTime = performance.now();
  for (let i = 0; i < times; i++) {
    const ret = fn();
    if (ret instanceof Promise) {
      // eslint-disable-next-line no-await-in-loop
      if (await ret) {
        return;
      }
    } else if (ret) {
      return;
    }
    if (i === times - 1) {
      if (typeof err === 'function') {
        err = err();
      }
      throw err;
    }

    if (timeout && performance.now() + interval - startTime >= timeout) {
      if (typeof err === 'function') {
        err = err();
      }
      throw err;
    }

    // eslint-disable-next-line no-await-in-loop
    await pause(interval);
  }
}
