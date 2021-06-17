function removeFalseyValues<T extends ObjectOf<any>>(
  obj: T,
) {
  const newObj = {} as {
    [P in keyof T]-?: Exclude<T[P], null | undefined | false>
  };
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v !== 'undefined' && v !== false) {
      newObj[k] = v;
    }
  }

  return newObj;
}

export default removeFalseyValues;
