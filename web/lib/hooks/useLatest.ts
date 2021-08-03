// If ref needs to be used before useLayoutEffect, use useLatestImmediate.
export default function useLatest<T>(val: T): React.MutableRefObject<T> {
  const ref = useRef(val);

  useLayoutEffect(() => {
    ref.current = val;
  });

  return ref;
}
