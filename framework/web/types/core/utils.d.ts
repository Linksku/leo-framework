declare module '*.scss' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.svg' {
  const content: React.SVGFactory;
  export default content;
}

// https://stackoverflow.com/a/57683652
type Expand<T> = T extends Primitive ? T
  : T extends Set<infer U> ? Set<Expand<U>>
  : T extends Map<infer K, infer V> ? Map<K, Expand<V>>
  : T extends BuiltInObjects ? T
  : T extends infer O ? {
    [K in keyof O]: K extends 'prototype' ? O[K] : Expand<O[K]>
  } : never;
