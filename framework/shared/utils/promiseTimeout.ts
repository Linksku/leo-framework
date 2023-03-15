export default async function promiseTimeout<T extends Promise<any>>(
  promise: T,
  timeout: number,
  err: Error,
): Promise<Awaited<T>> {
  return Promise.race([
    promise,
    new Promise<never>((_, fail) => {
      setTimeout(() => {
        fail(err);
      }, timeout);
    }),
  ]);
}
