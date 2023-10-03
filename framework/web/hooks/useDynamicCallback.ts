import useLatest from 'hooks/useLatest';

// Don't use in children effect, ideally don't pass to children.
// https://github.com/facebook/react/issues/16956#issuecomment-536636418
export default function useDynamicCallback<
  // eslint-disable-next-line @typescript-eslint/ban-types
  Cb extends Function,
>(cb: Cb): Stable<Cb> {
  let didRunEffectAfterRender = false;
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    didRunEffectAfterRender = true;
  });

  const latestRef = useLatest(cb);

  return useConst(() => ((...args: any[]) => {
    if (!didRunEffectAfterRender) {
      ErrorLogger.warn(new Error('useDynamicCallback: cb used immediately in render'));
    }

    return latestRef.current(...args);
  }) as unknown as Cb);
}
