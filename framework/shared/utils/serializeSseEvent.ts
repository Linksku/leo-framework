export default function serializeSseEvent(name: string, params: JsonObj = {}) {
  if (!process.env.PRODUCTION
    && (typeof params !== 'object' || Array.isArray(params))) {
    throw new Error(`serializeEvent: invalid params: ${JSON.stringify(params)}`);
  }

  return JSON.stringify({ name, params });
}

export function unserializeSseEvent(str: string): {
  name: string,
  params: ObjectOf<any>,
} {
  const { name, params } = JSON.parse(str);
  return { name, params: params ?? {} };
}
