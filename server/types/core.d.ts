import type express from 'express';

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
}
