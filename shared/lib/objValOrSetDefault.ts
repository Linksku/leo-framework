export default function objValOrSetDefault<Obj extends Record<string, any>>(
  obj: Obj,
  k: (keyof Obj) | number,
  defaultVal: Exclude<ValueOf<Obj>, undefined | null>,
): Exclude<ValueOf<Obj>, undefined | null> {
  if (typeof k === 'number') {
    k = k.toString();
  }
  if (!Object.prototype.hasOwnProperty.call(obj, k)) {
    obj[k] = defaultVal;
  }
  return obj[k];
}
