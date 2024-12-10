const EventHandlers = reactLazy(() => import(
  /* webpackChunkName: 'deferred' */ './EventHandlers'
), null);

export default EventHandlers;
