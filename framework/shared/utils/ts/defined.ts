export default function defined<T>(val: T): Exclude<T, undefined> {
  if (!process.env.PRODUCTION && typeof val === 'undefined') {
    throw new Error('defined: val is undefined');
  }
  return val as Exclude<T, undefined>;
}
