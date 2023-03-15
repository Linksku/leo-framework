export default function hasOwnProp<
  Obj extends Partial<Record<PropertyKey, any>>,
  Prop extends PropertyKey,
  AllObjs extends UnionToIntersection<Obj>,
>(
  obj: Obj,
  prop: Prop,
): obj is Obj & (IsNarrowKey<Prop> extends true
  ? Record<
    Prop,
    Prop extends keyof AllObjs ? AllObjs[Prop] : unknown
  >
  : any) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
