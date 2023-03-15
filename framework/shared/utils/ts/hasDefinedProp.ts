export default function hasDefinedProp<
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
  return obj[prop] !== undefined;
}
