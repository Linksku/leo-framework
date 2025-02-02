// Don't use in children effect, ideally don't pass to children.
// https://github.com/facebook/react/issues/16956#issuecomment-536636418
export default function useLatestCallback<
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  Cb extends Function,
>(cb: Cb): Stable<Cb> {
  const ref = useRef(cb);

  const didRunEffectAfterRenderRef = useRef(false);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    ref.current = cb;

    didRunEffectAfterRenderRef.current = true;
  });

  return useCallback(
    (...args: any[]) => {
      if (!didRunEffectAfterRenderRef.current) {
        ErrorLogger.warn(new Error('useLatestCallback: cb used immediately in render'));
      }

      return ref.current(...args);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  ) as unknown as Stable<Cb>;
}
