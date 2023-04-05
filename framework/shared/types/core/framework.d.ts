import type { setTimeout as _setTimeout } from 'timers';
import type { Console } from 'node:console';
import type { Performance } from 'perf_hooks';

declare global {
  declare module '*.txt' {
    const content: string;
    export default content;
  }

  declare module '*.json' {
    const content: unknown;
    export default content;
  }

  const window: typeof globalThis | undefined;
  const setTimeout: typeof _setTimeout;
  const console: Console;
  const performance: Performance;

  interface ObjectConstructor {
    keys(o: any[]): never;
    keys<T>(o: T & (T extends any[] ? never : object)): string[];
    create(o: null): ObjectOf<any>;
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

  type FrameworkEnv = {
    [key: string]: unknown;

    NODE_ENV: 'production' | 'development';
    PRODUCTION: boolean; // NODE_ENV = production
    SERVER: 'production' | 'development';
    JS_VERSION: string;
    IS_SERVER_SCRIPT?: string;
    SERVER_SCRIPT_PATH?: string;
    IS_DOCKER?: boolean;

    // From /env
    REMOTE_DOMAIN_NAME: string;
    REMOTE_IP: string;
    REMOTE_ROOT_DIR: string;
    PG_BT_DB: string;
    MZ_DB: string;
    PG_RR_DB: string;
    DOMAIN_NAME: string;
    PORT: string;
    BASE_PATH: string;
    MOBILE_APP_ID: string;
    APP_NAME: string;
    APP_NAME_LOWER: string;
    DESCRIPTION: string;
    FB_APP_ID: string;
    GA_ID: string;
    SENTRY_DSN_WEB: string;
    SENTRY_DSN_SERVER: string;
    FIREBASE_ID: string;
    FIREBASE_KEY: string;
    FIREBASE_MESSAGING_SENDER_ID: string;
    FIREBASE_APP_ID: string;
    FIREBASE_WEB_PUSH_KEY: string;

    // From /.env
    PG_BT_USER: string;
    PG_BT_PASS: string;
    PG_BT_SUPERUSER: string;
    MZ_USER: string;
    MZ_PASS: string;
    PG_RR_USER: string;
    PG_RR_PASS: string;
    PG_RR_SUPERUSER: string;
    REDIS_PASS: string;
    PASSWORD_PEPPER: string;
    COOKIE_JWT_KEY: string;
    HEADER_JWT_KEY: string;
    SSE_JWT_KEY: string;
    SSL_KEY: string;
    SSL_CERT: string;
    AWS_REGION: string;
    AWS_ACCESS_ID: string;
    AWS_SECRET_KEY: string;
    MAPBOX_TOKEN: string;
    DO_SPACES_REGION: string;
    DO_SPACES_BUCKET: string;
    DO_SPACES_ID: string;
    DO_SPACES_SECRET: string;
    CF_ZONE_ID: string;
    CF_USERNAME: string;
    CF_API_KEY: string;
  };

  declare namespace __WebpackModuleApi {
    export interface NodeProcess {
      env: FrameworkEnv;
    }
  }

  type OSTypes = 'android' | 'ios' | 'mobile' | 'windows' | 'osx' | 'linux' | 'other' | 'unknown';
}
