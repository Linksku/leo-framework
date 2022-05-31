export default function assertType<T>(
  validator: (val2: any) => boolean,
  val: any,
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
