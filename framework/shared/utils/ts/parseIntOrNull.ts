export default function parseIntOrNull(val: unknown, radix = 10): number | null {
  if (typeof val === 'string') {
    val = Number.parseInt(val, radix);
    return Number.isFinite(val) ? val as number : null;
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.trunc(val);
  }
  return null;
}
