export default function notNull<T>(val: T) {
  if (process.env.NODE_ENV !== 'production' && typeof val === 'undefined') {
    throw new Error('notNull: val is null');
  }
  return val as Exclude<T, null>;
}
