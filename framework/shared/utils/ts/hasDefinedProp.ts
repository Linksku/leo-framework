function hasDefinedProp<
  Obj extends Partial<Record<PropertyKey, any>>,
  Prop extends PropertyKey,
  UnionKeys extends AllKeys<Obj>,
>(
  obj: Obj,
  prop: Prop & (IsNarrowKey<Prop> extends true ? any : never),
): obj is Obj & (Obj extends any
  ? {
    [K in Prop]: K extends keyof Obj ? Exclude<Obj[K], undefined>
      : K extends UnionKeys ? never
      : unknown
  }
  : never);

function hasDefinedProp(
  obj: Partial<Record<PropertyKey, any>>,
  prop: PropertyKey,
): boolean;

function hasDefinedProp(
  obj: Partial<Record<PropertyKey, any>>,
  prop: PropertyKey,
) {
  return obj[prop] !== undefined;
}

export default hasDefinedProp;
