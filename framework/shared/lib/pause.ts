export default async function pause(timeout: number) {
  return new Promise<void>(succ => {
    setTimeout(() => succ(), timeout);
  });
}
