export default async function promiseObj<T>(
  obj: { [P in keyof T]: PromiseLike<T[P]> | T[P] },
) {
  const keys = Object.keys(obj);
  const results = await Promise.all(keys.map(k => obj[k]));

  const newObj = {};
  for (const [i, k] of keys.entries()) {
    newObj[k] = results[i];
  }
  return newObj as { [P in keyof T]: T[P] };
}
