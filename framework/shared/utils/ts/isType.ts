export default function isType<T>(
  validator: (val2: any) => boolean,
  val: any,
): val is T {
  try {
    if (validator(val)) {
      return true;
    }
  } catch {}

  if (!process.env.PRODUCTION) {
    // eslint-disable-next-line no-console
    console.log(`isType: wrong type for "${val}"`);
  }
  return false;
}
