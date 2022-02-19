export default function removeUndefinedValues<T extends ObjectOf<any>>(
  obj: T,
) {
  const newObj = {} as {
    [P in keyof T]-?: Exclude<T[P], undefined>
  };
  for (const [k, v] of TS.objEntries(obj)) {
    if (v !== 'undefined') {
      newObj[k] = v;
    }
  }

  return newObj;
}
