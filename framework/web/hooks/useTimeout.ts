export default function useTimeout(
  cb: Stable<() => void>,
  delay: number,
) {
  useEffect(() => {
    const timer = setTimeout(() => {
      cb();
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [cb, delay]);
}
