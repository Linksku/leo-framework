// Usually hasDefinedProperty is better with TS.
export default function hasOwnProperty<
  Obj extends ObjectOf<any>,
  Prop extends PropertyKey,
>(
  obj: Obj,
  prop: Prop,
): obj is {
  [P in keyof Obj]: P extends Prop ? Exclude<Obj[P], undefined> : Obj[P];
} {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
