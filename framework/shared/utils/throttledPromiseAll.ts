export default async function throttledPromiseAll<T, T2 extends Promise<any>>(
  maxConcurrent: number,
  iterable: Iterable<T>,
  mapper: (item: T, idx: number) => T2,
): Promise<Awaited<T2>[]> {
  const arr = Array.isArray(iterable) ? iterable as T[] : [...iterable];
  let nextIdx = 0;
  let hadErr = false;
  const results = Array.from({ length: arr.length });
  await Promise.all(Array.from({ length: maxConcurrent })
    .map(async () => {
      while (nextIdx < arr.length && !hadErr) {
        const curIdx = nextIdx;
        nextIdx++;
        try {
          const promise = mapper(arr[curIdx], curIdx);
          // eslint-disable-next-line no-await-in-loop
          results[curIdx] = await promise;
        } catch (err) {
          hadErr = true;
          throw err;
        }
      }
    }));
  return results as Awaited<T2>[];
}
