import type express from 'express';
import type { JSONSchema as JSONSchemaType } from 'objection';

declare global {
  declare namespace Express {
    export interface Request {
      currentUserId: number | undefined;
    }
  }

  type ExpressRequest = express.Request & {
    currentUserId: number | undefined;
  };
  type ExpressResponse = express.Response;

  type JSONSchema = JSONSchemaType;
}
