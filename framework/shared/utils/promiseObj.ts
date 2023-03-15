export default async function promiseObj<
  Obj extends ObjectOf<any>,
  Ret extends {
    [P in keyof Obj]: Awaited<Obj[P]>;
  },
>(
  obj: Obj,
): Promise<Ret> {
  const results = await Promise.all(TS.objValues(obj));

  const newObj = {} as Ret;
  for (const [i, k] of TS.objKeys(obj).entries()) {
    newObj[k] = results[i];
  }
  return newObj;
}
