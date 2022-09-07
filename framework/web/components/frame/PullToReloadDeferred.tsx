import type { Props } from './PullToReload';

const PullToReload = React.lazy(
  async () => import(/* webpackChunkName: 'deferred' */ './PullToReload'),
);

export default function PullToReloadDeferred({
  children,
  ...props
}: React.PropsWithChildren<Props>) {
  return (
    <React.Suspense
      fallback={(
        <div {...props}>
          {children}
        </div>
      )}
    >
      <PullToReload {...props}>
        {children}
      </PullToReload>
    </React.Suspense>
  );
}
