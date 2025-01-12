export default function useInterval(
  cb: () => void,
  delay: number,
) {
  if (!process.env.PRODUCTION && delay < 10) {
    throw new Error('useInterval: delay must be at least 10ms');
  }

  const latestCb = useLatestCallback(cb);
  useEffect(() => {
    const timer = setInterval(() => {
      latestCb();
    }, delay);

    return () => {
      clearInterval(timer);
    };
  }, [latestCb, delay]);
}
