import useMountedState from 'react-use/lib/useMountedState';

import useLatest from 'lib/hooks/useLatest';

export default function useVisibilityObserver<T extends HTMLElement | undefined>(
  {
    onVisible,
    onHidden,
  }: {
    onVisible?: Memoed<() => void>,
    onHidden?: Memoed<() => void>,
  },
): React.RefCallback<T> {
  const cbRef = useLatest({
    onVisible,
    onHidden,
  });
  const isMounted = useMountedState();
  const elemRef = useRef<T>();
  const observerRef = useRef(useMemo(() => new IntersectionObserver(entries => {
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
  }), [cbRef, isMounted]));

  return useCallback((elem: T) => {
    if (elem) {
      observerRef.current.observe(elem);
      elemRef.current = elem;
    } else if (elemRef.current) {
      observerRef.current.unobserve(elemRef.current);
    }
  }, []);
}
