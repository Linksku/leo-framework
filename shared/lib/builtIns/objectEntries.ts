type _ObjectEntries<T extends ObjectOf<any>> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export default function objectEntries<T extends ObjectOf<any>>(obj: T): _ObjectEntries<{
  [P in keyof T]-?: T[P];
}> {
  return Object.entries(obj);
}
