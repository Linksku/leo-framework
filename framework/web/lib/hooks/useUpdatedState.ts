export default function useUpdatedState<T>(
  initialState: (() => T) | T,
  updater: (s: T) => T,
): T {
  const ref = useRef(initialState instanceof Function ? initialState() : initialState);
  const newState = updater(ref.current);

  useLayoutEffect(() => {
    ref.current = newState;
  });

  return newState;
}
