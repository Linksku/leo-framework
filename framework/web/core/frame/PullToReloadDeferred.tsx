import ErrorBoundary from 'core/frame/ErrorBoundary';
import type { Props } from './PullToReload';

const PullToReload = reactLazy(() => import(
  /* webpackChunkName: 'deferred' */ './PullToReload'
));

export default function PullToReloadDeferred({
  children,
  ...props
}: React.PropsWithChildren<Props>) {
  return (
    <ErrorBoundary
      Loading={(
        <div {...props}>
          {children}
        </div>
      )}
      renderError={() => (
        <div {...props}>
          {children}
        </div>
      )}
    >
      <PullToReload {...props}>
        {children}
      </PullToReload>
    </ErrorBoundary>
  );
}
