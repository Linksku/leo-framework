export default function mapValOrSetDefault<
  M extends Map<any, any>,
  V = (M extends Map<any, infer T> ? T : never),
>(
  map: M,
  k: M extends Map<infer T, any> ? T : never,
  defaultVal: M extends Map<any, infer T> ? T : never,
): V {
  const val = map.get(k) as V;
  if (val != null) {
    return val;
  }

  map.set(k, defaultVal);
  return defaultVal;
}
