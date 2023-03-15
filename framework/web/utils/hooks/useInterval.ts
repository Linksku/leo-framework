// Note: if cb changes often, need to add option to not reset timer
export default function useInterval(
  cb: Memoed<() => void>,
  delay: number,
) {
  if (!process.env.PRODUCTION && delay < 10) {
    throw new Error('useInterval: delay must be at least 10ms');
  }

  useEffect(() => {
    const timer = setInterval(() => {
      cb();
    }, delay);

    return () => {
      clearInterval(timer);
    };
  }, [cb, delay]);
}
