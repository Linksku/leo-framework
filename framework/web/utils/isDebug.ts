// Note: caller should still check process.env.PRODUCTION for Terser
export default !process.env.PRODUCTION
  && (window.localStorage.getItem('DEBUG') == null
    || !!window.localStorage.getItem('DEBUG'));
