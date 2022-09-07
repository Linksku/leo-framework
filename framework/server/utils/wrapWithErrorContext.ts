import rethrowWithContext from 'utils/rethrowWithContext';

export default function wrapWithErrorContext<
  // eslint-disable-next-line @typescript-eslint/ban-types
  T extends Function,
>(
  fn: T,
  context: string,
) {
  return ((...args: any[]) => {
    try {
      const ret = fn(...args);
      if (ret instanceof Promise) {
        return ret.catch(err => rethrowWithContext(err, context));
      }
      return ret;
    } catch (err) {
      rethrowWithContext(err, context);
    }
    // Never reaches here.
    return null;
  }) as unknown as T;
}
