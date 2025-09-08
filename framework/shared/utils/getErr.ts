export default function getErr<T>(
  msgOrErr: T & (
    T extends (string | Error) ? unknown
    : unknown extends T ? unknown
    : never
  ),
  debugDetails: ObjectOf<any>,
): T extends Error ? T : Error {
  let err: Error;
  let stackLines: string[] = [];
  if (typeof msgOrErr === 'string') {
    err = new Error(msgOrErr);
    stackLines = err.stack?.split('\n') ?? [];
    stackLines.splice(1, 1);
  } else if (msgOrErr instanceof Error) {
    err = msgOrErr;
    stackLines = err.stack?.split('\n') ?? [];
  } else {
    err = new Error('getErr: got non-Error');
    err.debugCtx = {
      nonError: msgOrErr,
    };
    stackLines = err.stack?.split('\n') ?? [];
    stackLines.splice(1, 1);
  }

  if (TS.hasProp(debugDetails, 'ctx')) {
    if (!debugDetails.ctx) {
      delete debugDetails.ctx;
    } else if (err.debugCtx?.ctx) {
      const origCtx = debugDetails.ctx;
      for (let i = 1; i < 20; i++) {
        const k = i === 1 ? 'ctx' : `ctx${i}`;
        if (!process.env.PRODUCTION && origCtx === err.debugCtx[k]) {
          // eslint-disable-next-line no-console
          console.warn('getErr: duplicate ctx', origCtx, err.debugCtx);
          break;
        }

        if (!err.debugCtx[k]) {
          debugDetails[k] = origCtx;
          break;
        }

        delete debugDetails[k];
      }
    }
  }
  const newDebugCtx: ObjectOf<any> = {
    ...err.debugCtx,
    ...debugDetails,
  };

  err.stack = stackLines.join('\n');
  err.debugCtx = newDebugCtx;
  return err as T extends Error ? T : Error;
}
