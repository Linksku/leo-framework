export default function randInt(low: number, high: number): number {
  return low + (Math.random() * (high - low));
}
