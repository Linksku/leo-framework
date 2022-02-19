export default function omitSingle<
  Obj extends ObjectOf<any>,
  K extends keyof Obj,
>(key: K, { [key]: _, ...others }: Obj): Omit<Obj, K> {
  return others;
}
