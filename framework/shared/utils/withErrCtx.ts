function withErrCtx<T>(
  getVal: Promise<T>,
  ctx: string,
): Promise<T>;

function withErrCtx<T>(
  getVal: () => T,
  ctx: string,
): T;

function withErrCtx(
  getVal: Promise<any> | (() => any),
  ctx: string,
): any {
  if (getVal instanceof Promise) {
    return getVal.catch(err => {
      throw getErr(err, { ctx });
    });
  }

  try {
    return getVal();
  } catch (err) {
    throw getErr(err, { ctx });
  }
}

export default withErrCtx;
