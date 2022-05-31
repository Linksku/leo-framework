export default function deepObjKeys(obj: ObjectOf<any>, keys: string[] = []) {
  for (const key of Object.keys(obj)) {
    keys.push(key);
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      deepObjKeys(obj[key], keys);
    }
  }
  return keys;
}
