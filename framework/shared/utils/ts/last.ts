function last<T>(
  arr: [T, ...T[]],
): T;

function last(
  arr: [],
): undefined;

function last<T>(
  arr: T[],
): T | undefined;

function last<T>(
  arr: T[],
): T | undefined {
  return arr.at(-1);
}

export default last;
