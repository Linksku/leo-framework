// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
type MergeObjects<T1, T2> = (
  Omit<T1, keyof T2> & {
    [K in keyof T2]: K extends keyof T1
      ? (
        [T1[K], T2[K]] extends [(infer A)[], (infer B)[]] ? (A | B)[]
        : [T1[K], T2[K]] extends [ObjectOf<any>, ObjectOf<any>] ? MergeObjects<T1[K], T2[K]>
        : T2[K]
      )
      : T2[K]
  }
);

// Assumes objs are immutable
export default function deepMergeObjs<T1, T2>(
  obj1: T1,
  obj2: T2,
  opts: {
    mergeArrayType?: 'replace' | 'concat',
    allowOverride?: boolean,
  } = {},
): MergeObjects<T1, T2> {
  if (obj1 === obj2) {
    return obj1;
  }

  const {
    mergeArrayType = 'concat',
    allowOverride = true,
  } = opts;
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    return mergeArrayType === 'concat'
      ? [...obj1, ...obj2]
      : obj2;
  }
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const newObj = Object.create(null) as MergeObjects<T1, T2>;
    for (const k of Object.keys(obj1)) {
      if (!allowOverride && (k in obj2)) {
        throw new Error(`deepMergeObjs: disallowed overriding "${k}"`);
      }
      newObj[k] = (k in obj2) ? deepMergeObjs(obj1[k], obj2[k], opts) : obj1[k];
    }
    for (const k of Object.keys(obj2)) {
      if (!(k in obj1)) {
        newObj[k] = obj2[k];
      }
    }
    return newObj;
  }
  return obj2;
}
