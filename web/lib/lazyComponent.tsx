// use React.lazy

import Spinner from 'components/ui/Spinner';

const ComponentsCache = new Map<() => Promise<any>, React.ComponentType<any>>();

// Creates component that isn't downloaded until React attempts to mount it.
export default function lazyComponent<P>(
  getPromise: () => Promise<{ default: React.ComponentType<P> }>,
  Fallback: React.ComponentType<P> = () => (
    <Spinner />
  ),
) {
  // todo (old): high/mid when lazyComponent gets remounted, initialize Component in state
  return React.forwardRef(function LazyComponent(
    props: P,
    ref?: React.ForwardedRef<any>,
  ) {
    const [{ Component, error }, setState] = useState(() => ({
      Component: ComponentsCache.get(getPromise) as React.ComponentType<P> | null ?? null,
      error: null as Error | null,
    }));

    const mountedRef = useRef(false);

    useEffect(() => {
      mountedRef.current = true;
      if (Component) {
        return NOOP;
      }

      const promise = process.env.NODE_ENV === 'production'
        ? getPromise()
        : getPromise().then(
          async module => new Promise<{ default: React.ComponentType<P> }>(succ => {
            // todo (old): low/mid don't wait if already fetched.
            setTimeout(() => {
              succ(module);
            }, 400);
          }),
        );
      promise
        .then(module => {
          ComponentsCache.set(getPromise, module.default);
          if (mountedRef.current) {
            setState(s => ({ ...s, Component: module.default }));
          }
        })
        .catch(err => {
          if (process.env.NODE_ENV !== 'production') {
            console.error(err);
          }
          if (mountedRef.current) {
            setState(s => ({ ...s, error: err }));
          }
        });

      return () => {
        mountedRef.current = false;
      };
    });

    if (error) {
      throw error;
    }
    if (Component) {
      return (
        <Component ref={ref} {...props} />
      );
    }
    return (
      <Fallback ref={ref} {...props} />
    );
  });
}
