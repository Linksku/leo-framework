const noArgsSymbol = Symbol('noArgs');

export default function memoize<T extends AnyFunction>(
  this: any,
  fn: T,
  expiration?: number,
): T {
  const singleArgCache = new Map<string, {
    val: any,
    cacheTime: number,
  }>();
  const multiArgsCache = new Map<string, {
    val: any,
    cacheTime: number,
  }>();
  const boundFn = fn.bind(this);

  return ((...args) => {
    if (!process.env.PRODUCTION && args.some(a => a !== null && typeof a === 'object')) {
      throw new Error(`memoize(${fn.name}): only primitive args allowed.`);
    }

    if (args.length <= 1) {
      const key = args.length === 0 ? noArgsSymbol : args[0];
      let cached = singleArgCache.get(key);
      if (!cached
        || (expiration && performance.now() - cached.cacheTime >= expiration)) {
        cached = {
          val: boundFn(key),
          cacheTime: performance.now(),
        };
        singleArgCache.set(key, cached);
      }
      return cached.val;
    }

    const key = JSON.stringify(args);
    let cached = multiArgsCache.get(key);
    if (!cached
      || (expiration && performance.now() - cached.cacheTime >= expiration)) {
      cached = {
        val: boundFn(key),
        cacheTime: performance.now(),
      };
      multiArgsCache.set(key, cached);
    }
    return cached.val;
  }) as T;
}
