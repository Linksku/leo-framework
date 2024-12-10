export default async function promiseObj<
  Obj extends ObjectOf<any>,
>(obj: Obj): Promise<{
  [P in keyof Obj]: Awaited<Obj[P]>;
}> {
  const entries = TS.objEntries(obj);
  const results = await Promise.all(entries.map(pair => pair[1]));

  const newObj = Object.create(null) as {
    [P in keyof Obj]: Awaited<Obj[P]>;
  };
  for (let i = 0; i < entries.length; i++) {
    newObj[entries[i][0]] = results[i];
  }
  return newObj;
}
