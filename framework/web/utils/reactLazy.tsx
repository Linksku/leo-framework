import retryImport from './retryImport';

export default function reactLazy<T extends React.ComponentType<any>>(
  importComponent: () => Promise<{ default: T }>,
  fallback?: ReactNode,
): React.LazyExoticComponent<T> | T {
  if (fallback === undefined) {
    return React.lazy(() => retryImport(importComponent));
  }

  return function LazyComponent(props: React.ComponentProps<T>): ReactNode {
    const [Component, setComponent] = React.useState<T | null>(null);
    const catchAsync = useCatchAsync();

    useEffect(() => {
      let isMounted = true;
      catchAsync(
        retryImport(importComponent)
          .then(module => {
            if (isMounted) {
              setComponent(() => module.default);
            }
          }),
        'reactLazy',
      );

      return () => {
        isMounted = false;
      };
    }, [catchAsync]);

    return Component
      ? <Component {...props} />
      : fallback;
  } as T;
}
