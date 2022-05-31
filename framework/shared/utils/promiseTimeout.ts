export default async function promiseTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  err: Error,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, fail) => {
      setTimeout(() => {
        fail(err);
      }, timeout);
    }),
  ]);
}
