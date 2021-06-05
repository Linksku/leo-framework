function formatNumber(n: number): string {
  if (n >= 10000000) {
    return `${Math.round(n / 1000000)}M`;
  }
  if (n >= 999500) {
    return `${Math.round(n / 100000) / 10}M`;
  }
  if (n >= 10000) {
    return `${Math.round(n / 1000)}k`;
  }
  if (n >= 1000) {
    return `${Math.round(n / 100) / 10}k`;
  }
  return `${n}`;
}

export default formatNumber;
