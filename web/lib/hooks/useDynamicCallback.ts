// Only use the returned function in the current component, not children.
// https://github.com/facebook/react/issues/16956#issuecomment-536636418
export default function useDynamicCallback(callback: AnyFunction) {
  const ref = useRef(callback);

  useLayoutEffect(() => {
    ref.current = callback;
  }, [callback]);

  return useCallback((...args) => ref.current(...args), []);
}
