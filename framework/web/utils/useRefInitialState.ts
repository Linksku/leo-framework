export default function useRefInitialState<T>(
  initialState: () => T,
): React.MutableRefObject<T> {
  const ref = useRef<T>();
  if (ref.current === undefined) {
    ref.current = initialState();
  }
  return ref as React.MutableRefObject<T>;
}
