const Toasts = reactLazy(() => import(
  /* webpackChunkName: 'deferred' */ './Toasts'
), null);

export default Toasts;
