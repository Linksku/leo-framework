const Toasts = React.lazy(async () => import(
  /* webpackChunkName: 'deferred' */ './Toasts'
));

export default React.memo(function ToastsDeferred() {
  return (
    <React.Suspense
      fallback={null}
    >
      <Toasts />
    </React.Suspense>
  );
});
