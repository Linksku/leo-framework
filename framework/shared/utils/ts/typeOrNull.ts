export default function typeOrNull<T>(
  val: unknown,
  validator: (val2: unknown) => boolean,
): T | null {
  try {
    if (validator(val)) {
      return val as T;
    }
  } catch {}

  return null;
}
