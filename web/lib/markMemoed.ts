// For hook deps arrays.
export default function markMemoed<T>(val: T): Memoed<T> {
  return val as Memoed<T>;
}
