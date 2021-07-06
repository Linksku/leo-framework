export default async function promiseObj<T>(
  obj: { [P in keyof T]: PromiseLike<T[P]> | T[P] },
) {
  const keys = objectKeys(obj);
  const results = (await Promise.all(keys.map(k => obj[k]))) as ValueOf<T>[];

  const newObj = {} as { [P in keyof T]: T[P] };
  for (const [i, k] of keys.entries()) {
    newObj[k] = results[i];
  }
  return newObj;
}
