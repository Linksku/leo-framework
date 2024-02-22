const SlideUps = React.lazy(async () => import(
  /* webpackChunkName: 'deferred' */ './SlideUps'
));

export default React.memo(function SlideUpsDeferred() {
  return (
    <React.Suspense
      fallback={null}
    >
      <SlideUps />
    </React.Suspense>
  );
});
