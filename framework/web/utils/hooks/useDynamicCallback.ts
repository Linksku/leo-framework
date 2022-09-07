// Only use the returned function in the current component, don't pass to children.
// https://github.com/facebook/react/issues/16956#issuecomment-536636418
export default function useDynamicCallback<
  // eslint-disable-next-line @typescript-eslint/ban-types
  Cb extends Function,
>(
  callback: Cb,
): Memoed<Cb> {
  const ref = useRef(callback);

  useLayoutEffect(() => {
    ref.current = callback;
  });

  return useConst(
    () => ((...args: any[]) => ref.current(...args)) as unknown as Cb,
  );
}