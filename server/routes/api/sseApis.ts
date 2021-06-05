import jwt from 'jsonwebtoken';

import { defineApi } from 'services/ApiManager';
import SseBroadcastManager from 'services/SseBroadcastManager';

defineApi(
  {
    method: 'post',
    name: 'sseOtp',
    paramsSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    dataSchema: {
      type: 'object',
      properties: {
        otp: SchemaConstants.content,
      },
      additionalProperties: false,
    },
  },
  async function sseOtp({ currentUserId }) {
    if (!currentUserId) {
      return {
        data: null,
      };
    }

    const otp = await new Promise<Nullish<string>>(succ => {
      jwt.sign(
        { id: currentUserId },
        process.env.SSE_JWT_KEY as string,
        {
          expiresIn: 60 * 1000,
        },
        (err, otpJwt) => {
          if (err) {
            succ(null);
          } else {
            succ(otpJwt);
          }
        },
      );
    });
    return {
      data: {
        otp: otp ?? undefined,
      },
    };
  },
);

defineApi(
  {
    method: 'post',
    name: 'sseSubscribe',
    paramsSchema: {
      type: 'object',
      required: ['sessionId', 'eventName', 'eventParams'],
      properties: {
        sessionId: { type: 'string', minLength: 22 },
        eventName: SchemaConstants.name,
        eventParams: { type: 'object', properties: {} },
      },
      additionalProperties: false,
    },
  },
  function sseSubscribe({ sessionId, eventName, eventParams }) {
    // todo: high/hard validate event permissions

    SseBroadcastManager.subscribe(sessionId, eventName, eventParams);

    return {
      data: null,
    };
  },
);

defineApi(
  {
    method: 'post',
    name: 'sseUnsubscribe',
    paramsSchema: {
      type: 'object',
      required: ['sessionId', 'eventName', 'eventParams'],
      properties: {
        sessionId: { type: 'string', minLength: 22 },
        eventName: SchemaConstants.name,
        eventParams: { type: 'object', properties: {} },
      },
      additionalProperties: false,
    },
  },
  function sseUnsubscribe({ sessionId, eventName, eventParams }) {
    SseBroadcastManager.unsubscribe(sessionId, eventName, eventParams);

    return {
      data: null,
    };
  },
);
