import jwt from 'jsonwebtoken';

import { defineApi } from 'services/ApiManager';
import SseBroadcastManager from 'services/SseBroadcastManager';
import { DEFAULT_AUTH_EXPIRATION } from 'serverSettings';

defineApi(
  {
    method: 'get',
    name: 'sseOtp',
    // todo: low/easy add empty obj schema constant
    paramsSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    dataSchema: {
      type: 'object',
      required: ['otp'],
      properties: {
        otp: SchemaConstants.content.orNull(),
      },
      additionalProperties: false,
    },
  },
  async function sseOtpApi({ currentUserId }: ApiHandlerParams<'sseOtp'>) {
    if (!currentUserId) {
      return {
        data: {
          otp: null,
        },
      };
    }

    const otp = await new Promise<Nullish<string>>(succ => {
      jwt.sign(
        { id: currentUserId },
        TS.defined(process.env.SSE_JWT_KEY),
        {
          expiresIn: DEFAULT_AUTH_EXPIRATION / 1000,
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
        otp: otp ?? null,
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
              params: SchemaConstants.pojo,
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  function sseSubscribeApi({ sessionId, events }: ApiHandlerParams<'sseSubscribe'>) {
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
              params: SchemaConstants.pojo,
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  function sseUnsubscribeApi({ sessionId, events }: ApiHandlerParams<'sseUnsubscribe'>) {
    for (const event of events) {
      SseBroadcastManager.unsubscribe(sessionId, event.name, event.params);
    }

    return {
      data: null,
    };
  },
);
