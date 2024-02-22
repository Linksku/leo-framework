import type express from 'express';
import type { JSONSchema4 } from 'json-schema';
// Unused import to extend Express with Express.Multer.File
import type _multer from 'multer';
import 'compression';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      currentUserId: EntityId | undefined;
      rc: RequestContext;
    }
  }

  type ExpressRequest = express.Request & {
    currentUserId: EntityId | undefined;
    rc: RequestContext;
  };

  type ExpressResponse = express.Response;

  type RequestContext = {
    method: string,
    path: string,
    apiParams?: ObjectOf<unknown>,
    currentUserId: EntityId | null,
    userAgent: string | null,
    os: OSType | null,
    platform: PlatformType | null,
    language: string | null,
    reqCache: Map<string, any>,
    debug: boolean,
    loadTesting: boolean,
    numDbQueries: number,
  };

  type JsonSchema = JSONSchema4;

  type JsonSchemaProperties = Defined<JsonSchema['properties']>;
}
