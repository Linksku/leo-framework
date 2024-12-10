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
): ValueOf<Obj> | undefined;

function getProp<
  Obj extends Partial<Record<PropertyKey, any>>,
>(
  obj: Partial<Record<PropertyKey, any>>,
  prop: PropertyKey,
): ValueOf<Obj> | undefined {
  if (obj instanceof Object
    || (typeof obj === 'object' && Object.getPrototypeOf(obj) === null)) {
    return obj[prop];
  }

  if (!process.env.PRODUCTION) {
    throw new Error('getProp: obj isn\'t an object.');
  }
  return undefined;
}

export default getProp;
