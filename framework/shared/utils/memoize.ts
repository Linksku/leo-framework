const noArgsSymbol = Symbol('noArgs');

export default function memoize<T extends AnyFunction>(
  this: any,
  fn: T,
  expiration?: number,
): T {
  const singleArgCache = Object.create(null) as ObjectOf<{
    val: any,
    cacheTime: number,
  }>;
  const multiArgsCache = Object.create(null) as ObjectOf<{
    val: any,
    cacheTime: number,
  }>;
  const boundFn = fn.bind(this);

  return ((...args) => {
    if (!process.env.PRODUCTION && args.some(a => a !== null && typeof a === 'object')) {
      throw new Error(`memoize(${fn.name}): only primitive args allowed.`);
    }

    if (args.length <= 1) {
      const key = args.length === 0 ? noArgsSymbol : args[0];
      let cached = singleArgCache[key];
      if (!cached
        || (expiration && performance.now() - cached.cacheTime >= expiration)) {
        singleArgCache[key] = cached = {
          val: boundFn(key),
          cacheTime: performance.now(),
        };
      }
      return cached.val;
    }

    const key = JSON.stringify(args);
    let cached = multiArgsCache[key];
    if (!cached
      || (expiration && performance.now() - cached.cacheTime >= expiration)) {
      multiArgsCache[key] = cached = {
        val: boundFn(key),
        cacheTime: performance.now(),
      };
    }
    return cached.val;
  }) as T;
}
