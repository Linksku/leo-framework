export default function literal<T>(val: T): Mutable<T> {
  return val as Mutable<T>;
}
