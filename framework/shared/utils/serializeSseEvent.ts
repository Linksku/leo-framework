import type { SseName, SseParams } from 'config/sse';

export default function serializeSseEvent<Name extends SseName>(
  name: Name,
  params?: SseParams[SseName],
) {
  if (!process.env.PRODUCTION
    && params
    && (typeof params !== 'object' || Array.isArray(params))) {
    throw new Error(`serializeEvent: invalid params: ${JSON.stringify(params)}`);
  }

  return JSON.stringify(params ? { name, params } : { name });
}

export function unserializeSseEvent<Name extends SseName>(str: string): {
  name: Name,
  params: SseParams[SseName],
} {
  const { name, params } = JSON.parse(str);
  return { name, params: params ?? {} };
}
