export default function defined<T>(val: T) {
  if (process.env.NODE_ENV !== 'production' && typeof val === 'undefined') {
    throw new Error('defined: val is undefined');
  }
  return val as Exclude<T, undefined>;
}
