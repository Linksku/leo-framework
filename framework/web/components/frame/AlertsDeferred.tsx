import type { Props } from './PullToReload';

const Alerts = React.lazy(
  async () => import(/* webpackChunkName: 'deferred' */ './Alerts'),
);

export default React.memo(function AlertsDeferred({
  children,
  ...props
}: React.PropsWithChildren<Props>) {
  return (
    <React.Suspense
      fallback={null}
    >
      <Alerts {...props}>
        {children}
      </Alerts>
    </React.Suspense>
  );
});
