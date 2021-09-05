export default function objValOrSetDefault<
  Obj extends Record<string, any>,
  K extends((keyof Obj) | number),
>(
  obj: Obj,
  _k: K,
  defaultVal: K extends keyof Obj
    ? Exclude<Obj[K], undefined | null>
    : Exclude<ValueOf<Obj>, undefined | null>): K extends keyof Obj
    ? Exclude<Obj[K], undefined | null>
    : Exclude<ValueOf<Obj>, undefined | null> {
  const k = (typeof _k === 'number' ? _k.toString() : _k) as keyof Obj;
  if (!Object.prototype.hasOwnProperty.call(obj, k)) {
    obj[k] = defaultVal;
  }
  return obj[k];
}
