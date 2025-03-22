export default function pick<Obj, Keys extends keyof Obj>(
  obj: Obj,
  keys: Keys[],
): Pick<Obj, Keys> {
  const newObj = Object.create(null) as Pick<Obj, Keys>;
  for (const k of keys) {
    newObj[k] = obj[k];
  }
  return newObj;
}
