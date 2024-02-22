const EventHandlers = React.lazy(async () => import(
  /* webpackChunkName: 'deferred' */ './EventHandlers'
));

export default React.memo(function EventHandlersDeferred() {
  return (
    <React.Suspense
      fallback={null}
    >
      <EventHandlers />
    </React.Suspense>
  );
});
