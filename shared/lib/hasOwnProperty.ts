export default function hasOwnProperty<T extends ObjectOf<any>>(
  obj: T,
  key: any,
): key is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
