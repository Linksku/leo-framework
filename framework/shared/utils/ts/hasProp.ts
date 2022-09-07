/*
hasProp for most cases
hasOwnProp for checking existence of key, undefined is allowed
hasDefinedProp for class instances
`in` for class instances, undefined is allowed
*/

function hasProp<
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

function hasProp(
  obj: Partial<Record<PropertyKey, any>>,
  prop: PropertyKey,
): boolean;

function hasProp(
  obj: Partial<Record<PropertyKey, any>>,
  prop: PropertyKey,
) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
    && obj[prop] !== undefined;
}

export default hasProp;
