export default function hasOwnProperty<
  Obj extends ObjectOf<any>,
  Prop extends PropertyKey,
>(
  obj: Obj,
  prop: Prop,
): obj is Obj & Record<Prop, any> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
