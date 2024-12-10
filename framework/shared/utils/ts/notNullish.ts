export default process.env.PRODUCTION
  ? function notNullish<T>(val: T): Exclude<T, null | undefined> {
    return val as Exclude<T, null | undefined>;
  }
  : function notNullish<T>(val: T): Exclude<T, null | undefined> {
    if (val === null) {
      throw new Error('notNullish: val is null');
    }
    if (val === undefined) {
      throw new Error('notNullish: val is undefined');
    }
    return val as Exclude<T, null | undefined>;
  };
