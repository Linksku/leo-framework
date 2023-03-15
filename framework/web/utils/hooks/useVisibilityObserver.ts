import useMountedState from 'utils/hooks/useMountedState';

import useLatest from 'utils/hooks/useLatest';

export default function useVisibilityObserver<T extends HTMLElement | undefined>(
  {
    onVisible,
    onHidden,
  }: {
    onVisible?: Memoed<() => void>,
    onHidden?: Memoed<() => void>,
  },
  opts?: IntersectionObserverInit,
): Memoed<React.RefCallback<T>> {
  const cbRef = useLatest({
    onVisible,
    onHidden,
  });
  const isMounted = useMountedState();
  const elemRef = useRef<T>();
  const observerRef = useRef(useConst(() => new IntersectionObserver(
    entries => {
      if (!isMounted()) {
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
