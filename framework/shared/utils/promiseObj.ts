export default async function promiseObj<
  Obj extends ObjectOf<any>,
  Ret extends {
    [P in keyof Obj]: Awaited<Obj[P]>;
  },
>(
  obj: Obj,
): Promise<Ret> {
  const entries = TS.objEntries(obj);
  const results = await Promise.all(entries.map(pair => pair[1]));

  const newObj = Object.create(null) as Ret;
  for (let i = 0; i < entries.length; i++) {
    newObj[entries[i][0]] = results[i];
  }
  return newObj;
}
