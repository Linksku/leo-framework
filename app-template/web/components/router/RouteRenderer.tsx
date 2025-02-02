import ErrorBoundary from 'core/frame/ErrorBoundary';
import ErrorPage from 'core/frame/ErrorPage';

export default function RouteRenderer({
  Component,
  loading,
  missingAuth,
  err,
}: {
  Component?: React.ComponentType<any>,
  loading?: boolean,
  missingAuth?: boolean,
  err?: string,
}) {
  if (loading) {
    return <ErrorPage title="Loading" showReload={false} />;
  }
  if (missingAuth) {
    return <ErrorPage title="Authentication required" />;
  }
  if (err) {
    return <ErrorPage title="Error" content={err} />;
  }
  return (
    <ErrorBoundary
      loadingElem={<ErrorPage title="Loading" showReload={false} />}
      renderError={msg => <ErrorPage title="Error" content={msg} />}
    >
      {Component && <Component />}
    </ErrorBoundary>
  );
}
