import 'utils/hacks/consoleTimeImports';

import 'styles/styles.scss';

import { createRoot } from 'react-dom/client';

import 'services/wdyr';
import App from 'App';
import fetcher from 'core/fetcher';
import iosDisableGestures from 'core/iosDisableGestures';
import disableDrag from 'core/disableDrag';
import handleBrowserSize from 'core/handleBrowserSize';

if (!process.env.PRODUCTION) {
  console.timeEnd('Imports');

  // @ts-ignore for debugging
  window.fetcher = fetcher;
}

window.addEventListener('unhandledrejection', e => {
  ErrorLogger.error(new Error(`unhandled rejection: ${e.reason}`));
});

iosDisableGestures();
disableDrag();
handleBrowserSize();

const tz = (new Date()).getTimezoneOffset() / 60;
if (tz >= -3 && tz <= 0) {
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

// todo: high/hard log actions
