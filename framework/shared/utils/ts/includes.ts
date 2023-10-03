export default function includes<T extends string>(
  arr: T[],
  search: string | null | undefined,
): search is T {
  return arr.includes(search as any);
}
