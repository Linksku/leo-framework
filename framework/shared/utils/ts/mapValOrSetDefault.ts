export default function mapValOrSetDefault<
  M extends Map<any, any>,
  V = (M extends Map<any, infer T> ? T : never),
>(
  map: M,
  k: M extends Map<infer T, any> ? T : never,
  defaultVal: M extends Map<any, infer T> ? T : never,
): V {
  if (map.get(k) == null) {
    map.set(k, defaultVal);
  }
  return map.get(k) as V;
}
