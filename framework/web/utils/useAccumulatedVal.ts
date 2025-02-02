export default function useAccumulatedVal<T>(
  initialVal: T,
  accumulator: (s: T) => T,
): Stable<T> {
  const ref = useRef(initialVal);

  const newVal = accumulator(ref.current);
  useEffect(() => {
    ref.current = newVal;
  });

  useDebugValue(newVal);

  return newVal as Stable<T>;
}
