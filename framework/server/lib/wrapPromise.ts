export default async function wrapPromise<T extends Promise<any>>(
  promise: T,
  severity: 'warn' | 'error' | 'fatal',
  ctx: string,
): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    ErrorLogger[severity](err, ctx);
  }
  return null;
}
