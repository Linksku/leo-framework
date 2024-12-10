import type express from 'express';
import type { JSONSchema4 } from 'json-schema';
// Unused import to extend Express with Express.Multer.File
import type _multer from 'multer';
import 'compression';

declare global {
  interface FrameworkEnv {
    IS_SERVER_SCRIPT?: string;
    SERVER_SCRIPT_PATH?: string;
    IS_DOCKER?: boolean;

    // From /env/env and /env/secrets
    // Loaded in initEnv.cjs
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
    AWS_BEDROCK_REGION: string;
    AWS_ACCESS_ID: string;
    AWS_SECRET_KEY: string;
    MAPBOX_TOKEN: string;
    DO_SPACES_SECRET: string;
    CF_ZONE_ID: string;
    CF_USERNAME: string;
    CF_API_KEY: string;
    FIREBASE_CLIENT_EMAIL: string;
    FIREBASE_PRIVATE_KEY: string;
    INSTAGRAM_APP_SECRET: string;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      currentUserId: EntityId | undefined,
      rc: RequestContext,
    }
  }

  type ExpressRequest = express.Request & {
    currentUserId: EntityId | undefined,
    rc: RequestContext,
  };

  type ExpressResponse = express.Response;

  type RequestContext = {
    method: string,
    apiPath: string,
    apiParams?: ObjectOf<any>,
    referrer: string | null,
    currentUserId: EntityId | null,
    userAgent: string | null,
    os: OSType | null,
    platform: PlatformType | null,
    appVersion: string | null,
    language: string | null,
    ip: string | null,
    reqCache: Map<string, any>,
    debug: boolean,
    loadTesting: boolean,
    numDbQueries: number,
  };

  type JsonSchema = JSONSchema4;

  type JsonSchemaProperties = Defined<JsonSchema['properties']>;
}
