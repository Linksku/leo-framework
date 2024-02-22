export default async function throttledPromiseAll<T, T2>(
  maxConcurrent: number,
  iterable: Iterable<T>,
  mapper: (item: T, idx: number) => Promise<T2>,
): Promise<T2[]> {
  const arr = Array.isArray(iterable) ? iterable as T[] : [...iterable];
  let nextIdx = 0;
  let hadErr = false;
  const results = Array.from({ length: arr.length });
  await Promise.all(Array.from({ length: maxConcurrent })
    .map(async _ => {
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
  return results as T2[];
}

/*
  return new Promise<T2[]>((succ, fail) => {
    let curIdx = 0;
    const results: T2[] = [];
    let hadErr = false;

    const onReject = (err: unknown) => {
      hadErr = true;
      fail(err);
    };

    const onResolve = (res: T2) => {
      if (hadErr) {
        return;
      }

      results.push(res);
      if (results.length === arr.length) {
        succ(results);
      } else if (curIdx < arr.length - 1) {
        curIdx++;
        const promise = mapper(arr[curIdx]);
        promise
          .then(onResolve)
          .catch(onReject);
      }
    };

    for (let i = 0; i < maxConcurrent && i < arr.length; i++) {
      const promise = mapper(arr[i]);
      promise
        .then(onResolve)
        .catch(onReject);
    }
  });
*/
