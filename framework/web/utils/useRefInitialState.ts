export default function useRefInitialState<T>(
  initialState: () => T,
): React.RefObject<T> {
  const ref = useRef<T>(undefined);
  if (ref.current === undefined) {
    ref.current = initialState();
  }
  return ref as React.RefObject<T>;
}
