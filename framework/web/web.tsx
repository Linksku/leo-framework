import 'utils/hacks/consoleTimeImports';

import 'styles/styles.scss';

import { createRoot } from 'react-dom/client';

import 'services/wdyr';
import App from 'App';
import fetcher from 'utils/fetcher';
import preventClicksAfterMove from 'utils/preventClicksAfterMove';
import setVhCssVar from 'utils/setVhCssVar';

if (!process.env.PRODUCTION) {
  console.timeEnd('Imports');

  // @ts-ignore for debugging
  window.fetcher = fetcher;
}

window.addEventListener('unhandledrejection', e => {
  ErrorLogger.error(new Error(`unhandled rejection: ${e.reason}`));
});

document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());

preventClicksAfterMove();
setVhCssVar();

const tz = (new Date()).getTimezoneOffset() / 60;
if (tz >= 2 && tz <= 11) {
  const root = createRoot(TS.notNull(document.getElementById('react')));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  // todo: high/veryhard gdpr
  // eslint-disable-next-line no-alert
  alert('Not available outside US/Canada.');
}

// todo: high/veryhard log actions
