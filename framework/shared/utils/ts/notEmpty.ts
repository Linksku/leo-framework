export default function notEmpty<T>(
  arr: T[],
): arr is [T, ...T[]] {
  return arr.length > 0;
}
