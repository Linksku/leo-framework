export default function formatNumber(n: number): string {
  if (n >= 10_000_000) {
    return `${Math.round(n / 1_000_000)}M`;
  }
  if (n >= 999_500) {
    return `${Math.round(n / 100_000) / 10}M`;
  }
  if (n >= 10_000) {
    return `${Math.round(n / 1000)}k`;
  }
  if (n >= 1000) {
    return `${Math.round(n / 100) / 10}k`;
  }
  return `${n}`;
}
