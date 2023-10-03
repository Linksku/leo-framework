// If ref needs to be used before useLayoutEffect, use useLatestImmediate.
// Should be fine if used in event handlers
export default function useLatest<T>(val: T): React.MutableRefObject<T> {
  const ref = useRef(val);

  useLayoutEffect(() => {
    ref.current = val;
  });

  return ref;
}
