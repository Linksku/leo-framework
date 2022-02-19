export default function parseIntOrNull(val: any, radix = 10): number | null {
  if (typeof val === 'string') {
    val = Number.parseInt(val, radix);
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.trunc(val);
  }
  return null;
}
