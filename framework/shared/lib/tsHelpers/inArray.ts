export default function inArray<T>(
  val: any,
  arr: T[] | readonly T[],
): val is T {
  return arr.includes(val);
}
