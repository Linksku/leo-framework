// Usually hasDefinedProperty is better with TS.
export default function hasProperty<
  Obj extends ObjectOf<any>,
  Prop extends PropertyKey,
>(
  obj: Obj,
  prop: Prop,
): obj is {
  [P in keyof Obj]: P extends Prop ? Exclude<Obj[P], undefined> : Obj[P];
} {
  return prop in obj;
}
