export default async function pause(timeout: number): Promise<void> {
  return new Promise<void>(succ => {
    setTimeout(() => succ(), timeout);
  });
}
