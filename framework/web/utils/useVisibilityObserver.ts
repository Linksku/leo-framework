import { useHadRouteBeenActive } from 'stores/RouteStore';
import useGetIsMounted from 'utils/useGetIsMounted';
import useGetIsFirstRender from 'utils/useGetIsFirstRender';
import usePrevious from 'utils/usePrevious';

export default function useVisibilityObserver<T extends HTMLElement | undefined>(
  {
    onVisible,
    onHidden,
    root,
    getRoot,
    rootMargin,
    threshold,
  }: {
    onVisible?: Stable<() => void>,
    onHidden?: Stable<() => void>,
    root?: Stable<HTMLElement> | null,
    getRoot?: Stable<() => Nullish<HTMLElement>>,
    rootMargin?: string,
    threshold?: number | Stable<number[]>,
  },
): Stable<React.RefCallback<T>> {
  const [isVisible, setIsVisible] = useState(false);
  const wasVisible = usePrevious(isVisible);
  const hadRouteBeenActive = useHadRouteBeenActive(true);
  const getIsMounted = useGetIsMounted();
  const elemRef = useRef<T>();
  const getIsFirstRender = useGetIsFirstRender();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const getObserver = useCallback(
    () => {
      if (!observerRef.current && hadRouteBeenActive !== false) {
        let rootOrNull = root ?? getRoot?.();
        if (root && !root.isConnected) {
          if (!process.env.PRODUCTION) {
            // eslint-disable-next-line no-console
            console.warn('useVisibilityObserver: root not in document', { root });
          }

          rootOrNull = null;
        }

        observerRef.current = new IntersectionObserver(
          entries => {
            if (!getIsMounted()) {
              return;
            }

            for (const entry of entries) {
              if (entry.intersectionRatio > 0 || entry.isIntersecting) {
                // useState to allow renders to paint before calling onVisible
                setIsVisible(true);
              } else if (entry.intersectionRatio === 0 && !entry.isIntersecting) {
                setIsVisible(false);
              }
            }
          },
          {
            root: rootOrNull,
            rootMargin,
            threshold,
          },
        );
      }
      return observerRef.current;
    },
    [hadRouteBeenActive, getIsMounted, root, getRoot, rootMargin, threshold],
  );

  const visibilityRef = useCallback((elem: T) => {
    if (!process.env.PRODUCTION
      && root
      && elem
      && root.isConnected
      && !root.contains(elem)) {
      // eslint-disable-next-line no-console
      console.warn('useVisibilityObserver: elem not in root', { root, elem });
    }

    if (elem) {
      if (!getIsFirstRender()) {
        getObserver()?.observe(elem);
      }
      elemRef.current = elem;
    } else if (elemRef.current) {
      getObserver()?.unobserve(elemRef.current);
    }
  }, [getObserver, root, getIsFirstRender]);

  // Run after useLayoutEffect, in case element is moved out of viewport (e.g. tooltip)
  useEffect(() => {
    const elem = elemRef.current;
    if (elem) {
      getObserver()?.observe(elem);
    }

    return () => {
      if (elem) {
        getObserver()?.unobserve(elem);
      }
    };
  }, [getObserver]);

  useEffect(() => {
    if (isVisible && !wasVisible) {
      onVisible?.();
    } else if (!isVisible && wasVisible) {
      onHidden?.();
    }
  }, [isVisible, wasVisible, onVisible, onHidden]);

  return visibilityRef;
}
