import stringify from 'utils/stringify';

function _indentLines(str: string, spaces: number): string {
  if (!str) {
    return '';
  }
  return str.split('\n').map(line => ' '.repeat(spaces) + line).join('\n');
}

// JSON.parse(JSON.stringify({ a: undefined })) -> {}
// JSON.parse(JSON.stringify([undefined])) -> [null]
function _deepEqualIgnoreUndefined(objA: any, objB: any) {
  if (objA === objB) {
    return true;
  }

  if (objA === null || objB === null) {
    return false;
  }
  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) {
      return false;
    }

    for (let i = 0; i < objA.length; i++) {
      if (!_deepEqualIgnoreUndefined(objA[i] ?? null, objB[i] ?? null)) {
        return false;
      }
    }
  } else if (typeof objA === 'object' && typeof objB === 'object') {
    const keysA = Object.entries(objA).filter(pair => pair[1] !== undefined).map(pair => pair[0]);
    const keysB = Object.entries(objB).filter(pair => pair[1] !== undefined).map(pair => pair[0]);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const k of keysA) {
      if (!Object.prototype.hasOwnProperty.call(objB, k)
        || !_deepEqualIgnoreUndefined(objA[k], objB[k])) {
        return false;
      }
    }
  } else {
    return false;
  }

  return true;
}

// todo: low/mid auto add error props such as "errno" to debugCtx
export default function formatErr(
  err: unknown,
  { maxStackLines }: {
    maxStackLines?: number,
  } = {},
): string {
  if (err instanceof Error) {
    const debugCtxArr = err.debugCtx ? Object.entries(err.debugCtx) : [];
    if (!process.env.PRODUCTION) {
      for (const [key, val] of debugCtxArr) {
        if (val
          && !(val instanceof Error)
          && val instanceof Object
          && ((val.constructor !== Object && !Array.isArray(val))
            || !_deepEqualIgnoreUndefined(val, JSON.parse(TS.defined(JSON.stringify(val)))))) {
          // eslint-disable-next-line no-console
          console.warn(`formatErr: non-serializable debugCtx ${key}:`, val);
        }
      }
    }

    const debugCtxStr = debugCtxArr
      .map(([key, val]) => `${key}: ${formatErr(val, {
        maxStackLines: Math.min(3, maxStackLines ?? 3),
      })}`)
      .join('\n');
    let stackLines = err.stack?.trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.startsWith('at ') && !line.includes(' (node:'))
      ?? [];
    if (maxStackLines !== undefined) {
      stackLines = stackLines.slice(0, maxStackLines);
    }

    let msg = err.message.trim()
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n');
    if (err.debugCtx?.ctx) {
      msg = `${err.debugCtx.ctx}: ${msg}`;
    }
    const details = _indentLines(
      debugCtxStr + (debugCtxStr && stackLines.length ? '\n' : '') + stackLines.join('\n'),
      2,
    );
    return details ? `${msg}\n${details}` : msg;
  }

  if (err && typeof err === 'object') {
    return JSON.stringify(err).slice(0, 1000);
  }

  return stringify(err).slice(0, 1000);
}
