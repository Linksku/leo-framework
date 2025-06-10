declare module '*.txt' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: string;
  export default content;
}

declare module '*.ejs' {
  const content: string;
  export default content;
}

declare const window: typeof globalThis | undefined;

interface String {
  split(separator: string | RegExp, limit?: number): [string, ...string[]];
}

interface ObjectConstructor {
  keys(o: any[]): never;
  keys<T>(o: T & (T extends any[] ? never : object)): string[];
  create(o: null): ObjectOf<any>;
}

interface Array<T> {
  at<Arr extends T[], N extends number>(this: Arr, index: N):
    [N, Arr] extends [0, [any, ...any[]]] ? T
    : [N, Arr] extends [-1, [any, ...any[]]] ? T
    : T | undefined;
}

interface Error {
  debugCtx?: ObjectOf<any>;
}

interface JSON {
  stringify<T>(
    value: T,
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number,
  ): string | (
    T extends undefined | AnyFunction | symbol ? undefined
    : T extends Primitive | ObjectOf<any> | any[] ? never
    : undefined);
  stringify<T>(
    value: T,
    replacer?: (number | string)[] | null,
    space?: string | number,
  ): string | (
    T extends undefined | AnyFunction | symbol ? undefined
    : T extends Primitive | ObjectOf<any> | any[] ? never
    : undefined);
}

interface FrameworkEnv {
  [key: string]: unknown;

  NODE_ENV: 'production' | 'development';
  PRODUCTION: boolean;
  // todo: med/hard add staging server
  SERVER: 'production' | 'development';
  JS_VERSION: string;
}

declare namespace NodeJS {
  interface Process {
    env: FrameworkEnv;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ProcessEnv extends FrameworkEnv {}
}
