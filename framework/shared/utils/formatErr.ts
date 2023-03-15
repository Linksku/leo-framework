import shallowEqual from 'utils/shallowEqual';

export function serializeCtxVal(val: unknown): string {
  if (val instanceof Error) {
    return val.stack ?? val.message;
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return `${val}`;
}

// todo: low/mid auto add error props such as "errno" to debugCtx
export default function formatError(
  err: unknown,
  { maxStackLines }: { maxStackLines?: number } = {},
) {
  if (err instanceof Error) {
    const debugCtxArr = err.debugCtx ? Object.entries(err.debugCtx) : [];
    if (!process.env.PRODUCTION) {
      for (const [key, val] of debugCtxArr) {
        if (val
          && !(val instanceof Error)
          && val instanceof Object
          && ((val.constructor !== Object && !Array.isArray(val))
            || !shallowEqual(val, JSON.parse(TS.defined(JSON.stringify(val)))))) {
          // eslint-disable-next-line no-console
          console.warn(`formatError: non-serializable debugCtx ${key}:`, val);
        }
      }
    }

    const debugCtxStr = debugCtxArr
      .map(([key, val]) => `${key}: ${serializeCtxVal(val).slice(0, 1000)}`)
      .join('\n  ');
    let stackLines = err.stack?.split('\n') ?? [];
    if (maxStackLines !== undefined) {
      stackLines = stackLines.slice(0, maxStackLines + 1);
    }

    const msg = err.debugCtx?.ctx
      ? `${err.debugCtx.ctx}: ${stackLines[0]}`
      : stackLines[0];
    return `${msg}
${debugCtxStr ? `  ${debugCtxStr}
` : ''}${stackLines.slice(1).join('\n')}`;
  }

  if (err && typeof err === 'object') {
    return JSON.stringify(err).slice(1000);
  }

  return `${err}`;
}
