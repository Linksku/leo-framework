// Only for debugging
export default function pauseSync(timeout: number) {
  const startTime = performance.now();
  while (performance.now() - startTime < timeout) {
    // pass
  }
}
