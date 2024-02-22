// If ref needs to be used before useLayoutEffect, use useLatestImmediate.
// For callbacks, use useLatestCallback
export default function useLatest<T extends ObjectOf<any> | Primitive>(
  val: T & (T extends AnyFunction ? never : unknown),
): React.MutableRefObject<T> {
  const ref = useRef(val);

  useLayoutEffect(() => {
    ref.current = val;
  });

  return ref;
}
