import importStartTime from 'utils/hacks/importStartTime';
import 'core/polyfills';

import 'styles/styles.scss';
// Import global UI components first so their styles can be overridden
import 'components/base/Button';
import 'components/base/Img';
import 'components/base/Input';
import 'components/base/Link';
import 'components/base/Spinner';
import 'components/common/TruncatedText';

// Must come after styles to avoid being overridden
import 'core/prefetchInitialRoute';

import { createRoot } from 'react-dom/client';

import 'services/wdyr';
import App from 'App';
import fetcher from 'core/fetcher';
import disableGestures from 'core/disableGestures';
import disableOverscrollNav from 'core/disableOverscrollNav';
import chromeMomentumScrollHack from 'core/chromeMomentumScrollHack';
import handleBrowserSize from 'core/handleBrowserSize';
import getUrlParams from 'utils/getUrlParams';
import isDebug from 'utils/isDebug';
import { DISABLE_BROWSER_HACKS } from 'consts/ui';

import(
  /* webpackChunkName: 'deferred' */ './deferred'
);

if (!process.env.PRODUCTION) {
  // eslint-disable-next-line no-console
  console.log(`DEBUG: ${isDebug ? 'on' : 'off'}`);

  // eslint-disable-next-line no-console
  console.log(`Imports: ${Math.round((performance.now() - importStartTime) * 10) / 10}ms`);

  // @ts-ignore for debugging
  window.fetcher = fetcher;
}

window.addEventListener('unhandledrejection', e => {
  ErrorLogger.error(new Error(`unhandled rejection: ${e.reason}`));
});

if (!DISABLE_BROWSER_HACKS) {
  disableGestures();
  disableOverscrollNav();
  chromeMomentumScrollHack();
}
handleBrowserSize();

// todo: high/hard log actions
const tz = (new Date()).getTimezoneOffset() / 60;
if (tz >= -3 && tz <= 0 && getUrlParams().get('debug') === undefined) {
  // todo: high/veryhard gdpr
  // eslint-disable-next-line no-alert
  alert('Not available in Europe.');
} else {
  const root = createRoot(TS.notNull(document.getElementById('react')));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
