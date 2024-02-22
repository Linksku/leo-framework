export default function stringify(val: unknown): string {
  if (typeof val === 'string') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(val2 => stringify(val2)).join(',');
  }
  if (val && Object.getPrototypeOf(val) === Object.prototype) {
    return JSON.stringify(val);
  }
  return String(val);
}
