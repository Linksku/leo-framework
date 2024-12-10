type Mutable<T> = T extends Primitive ? T
  : T extends Set<infer U> ? Set<Mutable<U>>
  : T extends ReadonlySet<infer U> ? Set<Mutable<U>>
  : T extends Map<infer K, infer V> ? Map<K, Mutable<V>>
  : T extends ReadonlyMap<infer K, infer V> ? Map<K, Mutable<V>>
  : T extends BuiltInObjects ? T
  : (keyof T) extends never ? T
  : {
    -readonly [K in keyof T]: Mutable<T[K]>;
  };

export default function literal<T>(val: T): Mutable<T> {
  return val as Mutable<T>;
}
