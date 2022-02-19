export default function serializeEvent(name: string, params: Pojo = {}) {
  if (process.env.NODE_ENV !== 'production'
    && (typeof params !== 'object' || Array.isArray(params))) {
    throw new Error(`serializeEvent: invalid params: ${JSON.stringify(params)}`);
  }

  return JSON.stringify({ name, params });
}

export function unserializeEvent(str: string)
  : { name: string, params: ObjectOf<any> } {
  const { name, params } = JSON.parse(str);
  return { name, params: params ?? {} };
}
