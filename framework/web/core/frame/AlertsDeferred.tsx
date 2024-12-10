const Alerts = reactLazy(() => import(
  /* webpackChunkName: 'deferred' */ './Alerts'
), null);

export default Alerts;
