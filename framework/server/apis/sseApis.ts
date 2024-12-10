import { defineApi } from 'services/ApiManager';
import SseBroadcastManager from 'services/sse/SseBroadcastManager';
import { signJwt } from 'core/jwt';

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

    const otp = await signJwt('sse', { id: currentUserId });
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
          maxItems: 20,
        },
      },
      additionalProperties: false,
    },
  },
  async function sseSubscribeApi({
    sessionId,
    events,
    currentUserId,
  }: ApiHandlerParams<'sseSubscribe'>) {
    await SseBroadcastManager.subscribe(
      sessionId,
      events,
      currentUserId,
    );

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
    SseBroadcastManager.unsubscribe(sessionId, events);

    return {
      data: null,
    };
  },
);
