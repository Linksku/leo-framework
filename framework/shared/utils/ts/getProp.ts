function getProp<
  Obj extends Partial<Record<PropertyKey, any>>,
  Prop extends PropertyKey,
>(
  obj: Obj,
  prop: Prop & (IsNarrowKey<Prop> extends true ? any : never),
): Prop extends keyof Obj ? Obj[Prop] : unknown;

function getProp<
  Obj extends Partial<Record<PropertyKey, any>>,
>(
  obj: Obj,
  prop: PropertyKey,
): ValueOf<Obj>;

function getProp(
  obj: Partial<Record<PropertyKey, any>>,
  prop: PropertyKey,
) {
  if (obj === null || typeof obj !== 'object') {
    if (!process.env.PRODUCTION) {
      throw new Error('getProp: obj isn\'t an object.');
    }

    return undefined;
  }
  return obj[prop];
}

export default getProp;
