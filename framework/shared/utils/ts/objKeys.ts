export default function objKeys<K extends string, T extends Partial<Record<K, any>>>(
  obj: T,
): (keyof T & K)[] {
  return Object.keys(obj) as (keyof T & K)[];
}
