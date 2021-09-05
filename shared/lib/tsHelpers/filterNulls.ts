export default function filterNulls<T>(
  arr: (T | undefined | null)[],
): T[] {
  return arr.filter(v => v != null) as T[];
}
