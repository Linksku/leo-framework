export default process.env.PRODUCTION
  ? function defined<T>(val: T): Exclude<T, undefined> {
    return val as Exclude<T, undefined>;
  }
  : function defined<T>(val: T): Exclude<T, undefined> {
    if (val === undefined) {
      throw new Error('defined: val is undefined');
    }
    return val as Exclude<T, undefined>;
  };
