/*
hasProp for most cases
hasOwnProp for checking existence of key, undefined is allowed
hasDefinedProp for class instances
`in` for class instances, undefined is allowed
*/

export default function hasProp<
  Obj extends Partial<Record<PropertyKey, any>>,
  Prop extends PropertyKey,
  AllObjs extends UnionToIntersection<Obj>,
>(
  obj: Obj,
  prop: Prop,
): obj is Obj & (IsNarrowKey<Prop> extends true
  ? Record<
    Prop,
    Prop extends keyof AllObjs ? Exclude<AllObjs[Prop], undefined> : unknown
  >
  : any) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
    && obj[prop] !== undefined;
}
