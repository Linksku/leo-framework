import type { BackButtonListenerEvent } from '@capacitor/app';

import 'lib/hacks/consoleTimeImports';

import 'styles/styles.scss';

import { render } from 'react-dom';
import { App as Capacitor } from '@capacitor/app';

import 'lib/wdyr';
import App from 'App';
import fetcher from 'lib/fetcher';
import preventClicksAfterMove from 'lib/preventClicksAfterMove';
import setVhCssVar from 'lib/setVhCssVar';

if (process.env.NODE_ENV !== 'production') {
  console.timeEnd('imports');

  window.fetcher = fetcher;
}

window.addEventListener('unhandledrejection', e => {
  ErrorLogger.error(new Error(`unhandled rejection: ${e.reason}`));
});

document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());

// Capacitor Android.
void Capacitor.addListener('backButton', (event: BackButtonListenerEvent) => {
  if (event.canGoBack) {
    window.history.back();
  } else {
    Capacitor.exitApp();
  }
});

preventClicksAfterMove();
setVhCssVar();

render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('react'),
);

// todo: high/high error logging
// todo: high/high log actions
