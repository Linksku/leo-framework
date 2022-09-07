function hasOwnProp<
  Obj extends Partial<Record<PropertyKey, any>>,
  Prop extends PropertyKey,
  UnionKeys extends AllKeys<Obj>,
>(
  obj: Obj,
  prop: Prop & (IsNarrowKey<Prop> extends true ? any : never),
): obj is Obj & (Obj extends any
  ? {
    [K in Prop]: K extends keyof Obj ? Obj[K]
      : K extends UnionKeys ? never
      : unknown
  }
  : never);

function hasOwnProp(
  obj: Partial<Record<PropertyKey, any>>,
  prop: PropertyKey,
): boolean;

function hasOwnProp(
  obj: Partial<Record<PropertyKey, any>>,
  prop: PropertyKey,
) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export default hasOwnProp;
