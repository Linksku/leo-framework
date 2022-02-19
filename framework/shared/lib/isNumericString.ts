const regex = /-?\d+(\.\d+)?/;

export default function isNumericString(val: any) {
  return typeof val === 'string' && regex.test(val);
}
