function arrFirstDuplicate<T>(arr: T[]): T | undefined;

function arrFirstDuplicate<T, T2>(
  arr: T[],
  notFoundVal?: T2,
): T | T2;

function arrFirstDuplicate<T, T2>(
  arr: T[],
  notFoundVal?: T2,
) {
  const seen = new Set<T>();
  for (const item of arr) {
    if (seen.has(item)) {
      return item;
    }
    seen.add(item);
  }
  return notFoundVal as T2;
}

export default arrFirstDuplicate;
