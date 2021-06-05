export default function usePrevious<T>(state: T): T | undefined {
  const ref = useRef<T>();
  const prev = ref.current;
  ref.current = state;
  return prev;
}
