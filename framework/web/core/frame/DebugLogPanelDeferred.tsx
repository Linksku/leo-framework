const DebugLogPanelDeferred = reactLazy(() => import(
  /* webpackChunkName: 'deferred' */ './DebugLogPanel'
), null);

export default DebugLogPanelDeferred;
