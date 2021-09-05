export default function randArrItem<T>(arr: T[]): T {
  if (!arr.length) {
    throw new Error('randArrItem: only excepts non-empty arrays.');
  }
  return arr[Math.floor(Math.random() * arr.length)];
}
