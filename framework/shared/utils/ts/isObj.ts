export default function isObj(obj: unknown): obj is ObjectOf<any> {
  return !!obj && typeof obj === 'object';
}
