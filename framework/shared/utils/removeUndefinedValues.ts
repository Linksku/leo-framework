export default function removeUndefinedValues<T extends ObjectOf<any>>(
  obj: T,
) {
  const newObj = Object.create(null) as OmitOptional<T>;
  for (const [k, v] of TS.objEntries(obj)) {
    if (v !== undefined) {
      newObj[k] = v;
    }
  }

  return newObj;
}
