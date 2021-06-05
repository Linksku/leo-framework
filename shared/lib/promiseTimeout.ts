export default async function promiseTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  msg: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, fail) => {
      setTimeout(() => {
        fail(new Error(msg));
      }, timeout);
    }),
  ]);
}
