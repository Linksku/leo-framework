export default function useIntersectionObserver(
  elemRef: React.MutableRefObject<HTMLElement | null>,
  {
    onVisible,
    onHidden,
  }: {
    onVisible: Memoed<() => void>,
    onHidden: Memoed<() => void>,
  },
) {
  const ref = useRef({
    isMounted: false,
    onVisible,
    onHidden,
    observer: new IntersectionObserver(entries => {
      if (!ref.current.isMounted) {
        return;
      }

      for (const entry of entries) {
        if (entry.intersectionRatio > 0 || entry.isIntersecting) {
          ref.current.onVisible();
        } else if (entry.intersectionRatio === 0 && !entry.isIntersecting) {
          ref.current.onHidden();
        }
      }
    }),
  });
  ref.current.onVisible = onVisible;
  ref.current.onHidden = onHidden;

  useEffect(() => {
    ref.current.isMounted = true;
    if (elemRef.current) {
      ref.current.observer.observe(elemRef.current);
    }

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ref.current.isMounted = false;
      if (elemRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        ref.current.observer.unobserve(elemRef.current);
      }
    };
  }, [elemRef]);
}
