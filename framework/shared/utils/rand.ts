export default function rand(low: number, high: number): number {
  return low + Math.floor(Math.random() * (high - low));
}
