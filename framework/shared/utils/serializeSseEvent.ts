export default function serializeSseEvent(name: string, params?: JsonObj) {
  if (!process.env.PRODUCTION
    && params
    && (typeof params !== 'object' || Array.isArray(params))) {
    throw new Error(`serializeEvent: invalid params: ${JSON.stringify(params)}`);
  }

  return JSON.stringify(params ? { name, params } : { name });
}

export function unserializeSseEvent(str: string): {
  name: string,
  params: ObjectOf<any>,
} {
  const { name, params } = JSON.parse(str);
  return { name, params: params ?? {} };
}
