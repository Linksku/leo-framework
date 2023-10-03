import jwt from 'jsonwebtoken';

import { defineApi } from 'services/ApiManager';
import SseBroadcastManager from 'services/sse/SseBroadcastManager';
import { DEFAULT_COOKIES_TTL } from 'settings';
import { SSE_JWT_KEY } from 'helpers/auth/jwt';

defineApi(
  {
    method: 'get',
    name: 'sseOtp',
    paramsSchema: SchemaConstants.emptyObj,
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
        SSE_JWT_KEY,
        {
          expiresIn: DEFAULT_COOKIES_TTL / 1000,
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
  async function sseSubscribeApi({ sessionId, events, currentUserId }: ApiHandlerParams<'sseSubscribe'>) {
    // todo: high/hard validate event permissions

    await Promise.all(events.map(
      async event => SseBroadcastManager.subscribe(
        sessionId,
        event.name,
        event.params,
        currentUserId,
      ),
    ));

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
