const Lightbox = reactLazy(() => import(
  /* webpackChunkName: 'deferred' */ './Lightbox'
), null);

export default Lightbox;
