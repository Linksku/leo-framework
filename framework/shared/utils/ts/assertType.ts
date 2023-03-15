export default function assertType<T>(
  val: any,
  validator: (val2: any) => boolean,
  err?: Error,
): T {
  try {
    if (validator(val)) {
      return val;
    }
  } catch {}

  if (!process.env.PRODUCTION && err) {
    // eslint-disable-next-line no-console
    console.log(val);
  }
  throw err ?? new Error(`assertType: wrong type for "${val}"`);
}
