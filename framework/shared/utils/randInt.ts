export default function randInt(low: number, high: number): number {
  low = Math.ceil(low);
  high = Math.floor(high);
  return low + Math.floor(Math.random() * (high - low + 1));
}
