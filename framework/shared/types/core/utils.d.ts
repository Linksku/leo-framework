declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: 'production' | 'development';
    PRODUCTION: boolean;
    SERVER: 'production' | 'development';
    JS_VERSION: string,
  }
}

declare module '*.txt' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: unknown;
  export default content;
}

interface ObjectConstructor {
  keys(o: any[]): never;
  keys<T>(o: T & (T extends any[] ? never : object)): string[];
  create(o: null): ObjectOf<any>;
}

type ObjectOf<T> = Partial<Record<string, T>>;

type ValueOf<T extends ObjectOf<any>> = T[(keyof T) & string];

type Nullable<T> = { [P in keyof T]: T[P] | null };

type Nullish<T> = T | null | undefined;

type DeepReadonly<T> = T extends Primitive ? T
  : T extends Array<infer U> ? ReadonlyArray<DeepReadonly<U>>
  : T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>>
  : T extends Map<infer K, infer V> ? ReadonlyMap<K, DeepReadonly<V>>
  : T extends BuiltInObjects ? T
  : Readonly<{
    [K in keyof T]: DeepReadonly<T[K]>;
  }>;

type Mutable<T> = T extends Primitive ? T
  : T extends Set<infer U> ? Set<Mutable<U>>
  : T extends ReadonlySet<infer U> ? Set<Mutable<U>>
  : T extends Map<infer K, infer V> ? Map<K, Mutable<V>>
  : T extends ReadonlyMap<infer K, infer V> ? Map<K, Mutable<V>>
  : T extends BuiltInObjects ? T
  : {
    -readonly [K in keyof T]: Mutable<T[K]>;
  };

type ObjRequiredKeys<T, Keys extends keyof T> = Omit<T, Keys> & {
  [P in Keys]-?: Exclude<T[P], undefined>;
};

type StrictlyEmptyObj = Record<string, never>;

type Primitive = string | number | bigint | boolean | symbol | null | undefined;

// Not comprehensive.
type BuiltInObjects = AnyFunction
  | Date
  | Error
  | RegExp
  | ArrayBuffer;

// TS can't check object prototype.
interface Pojo {
  [K: string]: any;
}

type Json = Primitive | Pojo | JsonArr;

type JsonArr = Json[];

type AnyFunction = (...args: any[]) => any;

interface Constructor<T> extends Function { new (...args: any[]): T; }

// eslint-disable-next-line @typescript-eslint/ban-types
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];

// eslint-disable-next-line @typescript-eslint/ban-types
type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Don't use with entities.
type InstanceKey<T extends new () => any> = keyof InstanceType<T> & string;

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

// https://stackoverflow.com/a/50375286
type UnionToIntersection<U> =
  (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never;

type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;

type ValOrFunctionRet<T> = T extends AnyFunction ? ReturnType<T> : T;

type Defined<T> = Exclude<T, undefined>;

type IfUndefined<T, Default> = T extends undefined ? Default : T;

type ObjPropOrDefault<
  Obj,
  K,
  Default
> = K extends keyof Obj
  ? IfUndefined<Obj[K], Default>
  : Default;

type ExactMatch<T extends ObjectOf<any>, Expected extends ObjectOf<any>> = T extends Expected
  ? Exclude<keyof T, keyof Expected> extends never ? true : false
  : false;

type Get<
  T extends ObjectOf<any>,
  K extends string,
  Default = undefined
> = K extends keyof T ? T[K] : Default;

type AllKeys<T> = T extends unknown ? keyof T : never;

type IsNarrowKey<K extends PropertyKey> =
  string extends K ? false
  : number extends K ? false
  : symbol extends K ? false
  : true;
