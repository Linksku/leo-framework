const regex = /^-?\d+(\.\d+)?$/;

export default function isNumericString(val: unknown): boolean {
  return typeof val === 'string' && regex.test(val);
}
