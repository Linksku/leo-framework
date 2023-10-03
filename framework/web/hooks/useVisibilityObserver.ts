import useGetIsMounted from 'hooks/useGetIsMounted';

import useLatest from 'hooks/useLatest';

export default function useVisibilityObserver<T extends HTMLElement | undefined>(
  {
    onVisible,
    onHidden,
  }: {
    onVisible?: Stable<() => void>,
    onHidden?: Stable<() => void>,
  },
  opts?: IntersectionObserverInit,
): Stable<React.RefCallback<T>> {
  const cbRef = useLatest({
    onVisible,
    onHidden,
  });
  const getIsMounted = useGetIsMounted();
  const elemRef = useRef<T>();
  const observerRef = useRef(useConst(() => new IntersectionObserver(
    entries => {
      if (!getIsMounted()) {
        return;
      }

      for (const entry of entries) {
        if (entry.intersectionRatio > 0 || entry.isIntersecting) {
          cbRef.current.onVisible?.();
        } else if (entry.intersectionRatio === 0 && !entry.isIntersecting) {
          cbRef.current.onHidden?.();
        }
      }
    },
    opts,
  )));

  return useCallback((elem: T) => {
    if (elem) {
      observerRef.current.observe(elem);
      elemRef.current = elem;
    } else if (elemRef.current) {
      observerRef.current.unobserve(elemRef.current);
    }
  }, []);
}
