declare module '*.txt' {
  const content: string;
  export default content;
}

type ObjectOf<T> = Record<string, T>;

type ValueOf<T> = T[keyof T];

type Nullable<T> = { [P in keyof T]: T[P] | null };

type Nullish<T> = T | null | undefined;

type EmptyObj = Record<string, never>;

interface Object {
  hasOwnProperty<T extends ObjectOf<any>>(this: T, key: any): key is keyof T;
}

type _ObjectEntries<T extends ObjectOf<any>> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

interface ObjectConstructor {
  entries<T extends ObjectOf<any>>(o: T): _ObjectEntries<{
    [P in keyof T]-?: T[P];
  }>;
}

type Primitive = string | number | boolean | null | undefined;

// Only use for function params.
interface Pojo {
  [key: string]: Primitive | Primitive[] | Pojo | Pojo[];
}

type AnyFunction = (...args: any[]) => any;

// eslint-disable-next-line @typescript-eslint/ban-types
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];

// eslint-disable-next-line @typescript-eslint/ban-types
type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];

type InstanceKeys<T extends new () => any> = keyof InstanceType<T> & string;
