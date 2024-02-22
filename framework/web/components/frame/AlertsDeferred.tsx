const Alerts = React.lazy(async () => import(
  /* webpackChunkName: 'deferred' */ './Alerts'
));

export default React.memo(function AlertsDeferred() {
  return (
    <React.Suspense
      fallback={null}
    >
      <Alerts />
    </React.Suspense>
  );
});
