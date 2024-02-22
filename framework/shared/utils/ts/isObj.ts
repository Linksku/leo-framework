export default function isObj(obj: any): obj is ObjectOf<any> {
  return !!obj && typeof obj === 'object';
}
