export default function deepFreezeIfDev<T>(val: T): Readonly<T> {
  if (process.env.PRODUCTION
    || !val
    || typeof val !== 'object'
    || Object.isFrozen(val)
    || React.isValidElement(val)) {
    return val;
  }
  const obj: ObjectOf<any> = val;

  if (Array.isArray(obj)) {
    const newArr = [];
    for (const v of obj) {
      newArr.push(deepFreezeIfDev(v));
    }
    return Object.freeze(newArr) as unknown as T;
  }
  if (Object.getPrototypeOf(obj) === Object.prototype) {
    const newObj = Object.create(null);
    for (const k of Object.keys(obj)) {
      newObj[k] = deepFreezeIfDev(obj[k]);
    }
    return Object.freeze(newObj) as T;
  }
  return val;
}
