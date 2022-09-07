type Expand<T> = T extends Primitive ? T
  : T extends Set<infer U> ? Set<Expand<U>>
  : T extends Map<infer K, infer V> ? Map<K, Expand<V>>
  : T extends BuiltInObjects ? T
  : T extends ModelClass ? T
  : T extends Model ? T
  : T extends QueryBuilder<any> ? T
  : (keyof T) extends never ? T
  : T extends infer O ? {
    [K in keyof O]: K extends 'prototype' ? O[K] : Expand<O[K]>
  } : never;
