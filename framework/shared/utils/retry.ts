export default async function retry(
  fn: (() => boolean) | (() => Promise<boolean>),
  {
    times,
    interval,
    timeoutErr,
  }: {
    times: number,
    interval: number,
    timeoutErr: string,
  }) {
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
      throw timeoutErr;
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(interval);
  }
}
