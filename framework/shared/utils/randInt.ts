export default function randInt(low: number, high: number): number {
  return Math.round(low) + Math.floor(Math.random() * (high - low));
}
