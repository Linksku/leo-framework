import type express from 'express';
import type { JSONSchema4 } from 'json-schema';
// Unused import to extend Express with Express.Multer.File
import type _multer from 'multer';
import 'compression';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  declare namespace Express {
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
    os: OSTypes | null,
    language: string | null,
    cache: {
      set(key: string, value: any): any,
      get(key: string): any,
      has(key: string): any,
      delete(key: string): any,
      keys(): string[],
    },
    debug: boolean,
    profiling: boolean,
  };

  type BullQueueContext = {
    queueName: string,
    jobName: string,
    data: any,
  };

  type JSONSchema = JSONSchema4;
}
