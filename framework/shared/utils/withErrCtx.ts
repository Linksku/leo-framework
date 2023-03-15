export default async function withErrCtx<T>(
  promise: Promise<T>,
  ctx: string,
): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    throw getErr(err, { ctx });
  }
}
