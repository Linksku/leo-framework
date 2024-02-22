declare module '*.txt' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: unknown;
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

declare type FrameworkEnv = {
  [key: string]: unknown;

  NODE_ENV: 'production' | 'development';
  PRODUCTION: boolean;

  // todo: mid/hard add staging server
  SERVER: 'production' | 'development';
  JS_VERSION: string;
  IS_SERVER_SCRIPT?: string;
  SERVER_SCRIPT_PATH?: string;
  IS_DOCKER?: boolean;

  // todo: low/easy validate all vars are in env/env
  // From /env/env and /env/secrets
  PG_BT_USER: string;
  PG_BT_PASS: string;
  PG_BT_SUPERUSER: string;
  MZ_USER: string;
  MZ_PASS: string;
  PG_RR_USER: string;
  PG_RR_PASS: string;
  PG_RR_SUPERUSER: string;
  REDIS_PASS: string;
  MAX_CPU_PERCENT: string;
  DEV_PASSWORD_PEPPER: string;
  DEV_JWT_KEY: string;
  PROD_PASSWORD_PEPPER: string;
  PROD_JWT_KEY: string;
  DEPLOY_IP: string;
  DEPLOY_ROOT_DIR: string;
  SSL_KEY: string;
  SSL_CERT: string;
  AWS_REGION: string;
  AWS_ACCESS_ID: string;
  AWS_SECRET_KEY: string;
  MAPBOX_TOKEN: string;
  DO_SPACES_SECRET: string;
  CF_ZONE_ID: string;
  CF_USERNAME: string;
  CF_API_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
};

declare namespace NodeJS {
  interface Process {
    env: FrameworkEnv;
  }

  interface ProcessEnv extends FrameworkEnv {}
}
