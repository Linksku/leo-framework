import objectEntries from './builtIns/objectEntries';

function removeFalseyValues<T extends ObjectOf<any>>(
  obj: T,
) {
  const newObj = {} as {
    [P in keyof T]-?: Exclude<T[P], null | undefined | false>
  };
  for (const [k, v] of objectEntries(obj)) {
    if (v !== null && typeof v !== 'undefined' && v !== false) {
      newObj[k] = v;
    }
  }

  return newObj;
}

export default removeFalseyValues;
