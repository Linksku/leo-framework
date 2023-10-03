// For hook deps arrays.
export default function markStable<T>(val: T): Stable<T> {
  return val as Stable<T>;
}
