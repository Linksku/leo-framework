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
        defined(process.env.SSE_JWT_KEY),
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
      required: ['sessionId', 'events'],
      properties: {
        sessionId: { type: 'string', minLength: 22 },
        events: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'params'],
            properties: {
              name: SchemaConstants.name,
              params: { type: 'object', properties: {} },
            },
          },
        },
      },
      additionalProperties: false,
    },
  },
  function sseSubscribe({ sessionId, events }) {
    // todo: high/hard validate event permissions

    for (const event of events) {
      SseBroadcastManager.subscribe(sessionId, event.name, event.params);
    }

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
      required: ['sessionId', 'events'],
      properties: {
        sessionId: { type: 'string', minLength: 22 },
        events: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'params'],
            properties: {
              name: SchemaConstants.name,
              params: { type: 'object', properties: {} },
            },
          },
        },
      },
      additionalProperties: false,
    },
  },
  function sseUnsubscribe({ sessionId, events }) {
    for (const event of events) {
      SseBroadcastManager.unsubscribe(sessionId, event.name, event.params);
    }

    return {
      data: null,
    };
  },
);
