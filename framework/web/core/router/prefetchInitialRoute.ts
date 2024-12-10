import prefetchRoute from 'core/router/prefetchRoute';

// Import current route component immediately
let path = window.location.pathname;
try {
  path = decodeURIComponent(path);
} catch {}
prefetchRoute(path);

export {};
