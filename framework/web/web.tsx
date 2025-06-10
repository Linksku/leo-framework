import importStartTime from 'core/importStartTime';
import 'core/browserHacks/polyfills';

import 'styles/coreStyles.scss';
// Import global UI components first so their styles can be overridden
import 'components/common/Button';
import 'components/common/Img';
import 'components/common/Input';
import 'components/common/Link';
import 'components/common/Spinner';
import 'components/common/Textarea';
import 'components/common/TruncatedText';

// Must come after styles to avoid being overridden
import 'core/router/prefetchInitialRoute';

import { createRoot } from 'react-dom/client';

import 'services/wdyr';
import { HOME_URL } from 'consts/server';
import fetcher from 'core/fetcher';
import getUrlParams from 'utils/getUrlParams';
import isDebug from 'utils/isDebug';
import App from 'App';
import retryImport from 'utils/retryImport';

retryImport(() => import(
  /* webpackChunkName: 'deferred' */ './deferred'
))
  .catch(e => {
    ErrorLogger.warn(e, { ctx: 'import(deferred)' });
  });

if (!process.env.PRODUCTION) {
  if (HOME_URL.startsWith('https')
    && new URL(HOME_URL).origin !== window.location.origin) {
    // For ngrok
    window.location.href = HOME_URL;
    throw new Error('Redirecting');
  }

  // eslint-disable-next-line no-console
  console.log(`DEBUG: ${isDebug ? 'on' : 'off'}`);

  if (isDebug) {
    // eslint-disable-next-line no-console
    console.log(`Imports: ${Math.round((performance.now() - importStartTime) * 10) / 10}ms`);

    // @ts-expect-error for debugging
    window.fetcher = fetcher;
  }
}

window.addEventListener('unhandledrejection', e => {
  ErrorLogger.error(new Error(`unhandled rejection: ${e.reason}`));
});

// todo: high/hard log actions
// todo: low/med enable deeplinks
const tz = (new Date()).getTimezoneOffset() / 60;
if (tz >= -3 && tz <= 0
  // 'debug' param allowed in prod, unlike isDebug
  && getUrlParams().get('debug') === undefined) {
  // todo: high/veryhard gdpr
  // eslint-disable-next-line no-alert
  alert('Not available in Europe.');
} else {
  const root = createRoot(
    TS.notNull(document.getElementById('react')),
    {
      onUncaughtError(err) {
        ErrorLogger.error(err);
      },
    },
  );
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
