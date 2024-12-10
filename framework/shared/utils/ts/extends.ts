export default function isExtending<
  T1 extends Constructor<any>,
  T2 extends Constructor<any>,
>(
  obj: T1,
  cls: T2,
): obj is T1 & T2 {
  return obj.prototype instanceof cls;
}
