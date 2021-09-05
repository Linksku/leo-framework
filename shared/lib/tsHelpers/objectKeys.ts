export default function objectKeys<T extends ObjectOf<any>>(obj: T): (keyof T)[] {
  return Object.keys(obj);
}
