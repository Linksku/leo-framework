import retryImport from './retryImport';
import useEffectInitialMount from './useEffectInitialMount';
import useGetIsMounted from './useGetIsMounted';

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

    const getIsMounted = useGetIsMounted();
    useEffectInitialMount(() => {
      catchAsync(
        retryImport(importComponent)
          .then(module => {
            if (getIsMounted()) {
              setComponent(() => module.default);
            }
          }),
        'reactLazy',
      );
    });

    return Component
      ? <Component {...props} />
      : fallback;
  } as T;
}
