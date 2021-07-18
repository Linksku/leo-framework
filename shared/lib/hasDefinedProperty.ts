export default function hasDefinedProperty<
  Val,
  Prop extends PropertyKey,
>(
  obj: Record<string, Val>,
  prop: Prop,
): obj is Record<string, Val> & Record<Prop, Exclude<Val, undefined>> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
