function removeFalseyValues<T extends ObjectOf<any>>(
  obj: T,
) {
  const newObj = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== null && typeof obj[k] !== 'undefined' && obj[k] !== false) {
      newObj[k] = obj[k];
    }
  }

  return newObj as {
    [P in keyof T]-?: Exclude<T[P], null | undefined | false>
  };
}

export default removeFalseyValues;
