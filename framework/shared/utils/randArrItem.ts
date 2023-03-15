export default function randArrItem<T>(arr: T[]): T {
  if (!arr.length) {
    throw new Error('randArrItem: got empty array');
  }
  return arr[Math.floor(Math.random() * arr.length)];
}
