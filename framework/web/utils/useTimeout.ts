export default function useTimeout(
  cb: Stable<() => void>,
  delay: number,
): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      cb();
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [cb, delay]);
}
