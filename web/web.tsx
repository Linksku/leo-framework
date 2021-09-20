import 'lib/hacks/consoleTimeImports';

import 'styles/styles.scss';

import { render } from 'react-dom';

import 'lib/wdyr';
import App from 'App';
import fetcher from 'lib/fetcher';
import preventClicksAfterMove from 'lib/preventClicksAfterMove';
import setVhCssVar from 'lib/setVhCssVar';

if (process.env.NODE_ENV !== 'production') {
  console.timeEnd('Imports');

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
  render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('react'),
  );
} else {
  // todo: high/veryhard gdpr
  alert('Not available outside US/Canada.');
}

// todo: high/veryhard log actions
