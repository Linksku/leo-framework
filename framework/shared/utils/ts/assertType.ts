export default function assertType<T>(
  val: any,
  validator: (val2: unknown) => boolean,
  err?: Error,
): T {
  try {
    if (validator(val)) {
      return val as T;
    }
  } catch {}

  if (!process.env.PRODUCTION && err) {
    // eslint-disable-next-line no-console
    console.log(val);
  }
  throw err ?? new Error(`assertType: wrong type for "${val}"`);
}
