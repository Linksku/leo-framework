export default function rand(low: number, high: number): number {
  return low + (Math.random() * (high - low));
}
