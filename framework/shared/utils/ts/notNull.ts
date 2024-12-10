export default process.env.PRODUCTION
  ? function notNull<T>(val: T): Exclude<T, null> {
    return val as Exclude<T, null>;
  }
  : function notNull<T>(val: T): Exclude<T, null> {
    if (val === null) {
      throw new Error('notNull: val is null');
    }
    return val as Exclude<T, null>;
  };
