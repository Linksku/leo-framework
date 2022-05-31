export default function notNull<T>(val: T): Exclude<T, null> {
  if (!process.env.PRODUCTION && val === null) {
    throw new Error('notNull: val is null');
  }
  return val as Exclude<T, null>;
}
