declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: 'production' | 'development';
  }
}

declare module '*.txt' {
  const content: string;
  export default content;
}

// Useful until TS distinguishes between optional and undefined.
class __WITH_UNDEFINED {
  private [Symbol('__WITH_UNDEFINED')] = true;
}

type ObjectOf<T> = Partial<Record<string, T>>;

type ValueOf<T> = T[keyof T];

type Nullable<T> = { [P in keyof T]: T[P] | null };

type Nullish<T> = T | null | undefined;

type Mutable<T> = {
  -readonly [K in keyof T]: Mutable<T[K]>;
}

type StrictlyEmptyObj = Record<string, never>;

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

type InstanceKey<T extends new () => any> = keyof InstanceType<T> & string;

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

// https://stackoverflow.com/a/57683652/599184
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type ExpandRecursively<T> = T extends ObjectOf<any>
  ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
  : T;
