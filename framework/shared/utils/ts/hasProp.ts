/*
hasProp for most cases
hasDefinedProp for class instances
`in` for class instances, undefined is allowed
*/

export default function hasProp<
  Obj extends Partial<Record<PropertyKey, any>>,
  Prop extends PropertyKey,
  FilteredObj extends Obj extends any
    ? (Prop extends keyof Obj ? Obj : never)
    : never,
  Val extends [FilteredObj] extends [never]
    ? unknown
    : (Prop extends keyof FilteredObj ? FilteredObj[Prop] : never),
>(
  obj: Obj,
  prop: Prop,
): obj is ([FilteredObj] extends [never] ? Obj : FilteredObj) & Record<
  Prop,
  Exclude<Val, undefined>
> {
  return Object.prototype.hasOwnProperty.call(obj, prop)
    && obj[prop] !== undefined;
}
