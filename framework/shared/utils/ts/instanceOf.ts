export default function instanceOf<T1, T2 extends Constructor<any>>(
  obj: T1,
  cls: T2,
): obj is InstanceType<T2> {
  return obj instanceof cls;
}
