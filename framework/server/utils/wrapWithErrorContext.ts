import rethrowWithContext from 'utils/rethrowWithContext';

export default function wrapWithErrorContext<T extends AnyFunction>(
  fn: T,
  context: string,
) {
  return ((...args) => {
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
  }) as T;
}
