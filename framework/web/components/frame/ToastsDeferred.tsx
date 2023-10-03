import type { Props } from './PullToReload';

const Toasts = React.lazy(async () => import(
  /* webpackChunkName: 'deferred' */ './Toasts'
));

export default React.memo(function ToastsDeferred({
  children,
  ...props
}: React.PropsWithChildren<Props>) {
  return (
    <React.Suspense
      fallback={null}
    >
      <Toasts {...props}>
        {children}
      </Toasts>
    </React.Suspense>
  );
});
