export default async function promiseObj<T>(
  obj: { [P in keyof T]: PromiseLike<T[P]> | T[P] },
) {
  const results = await Promise.all(TS.objValues(obj)) as ValueOf<T>[];

  const newObj = {} as T;
  for (const [i, k] of TS.objKeys(obj).entries()) {
    newObj[k] = results[i];
  }
  return newObj;
}
