import { DISABLE_BROWSER_HACKS } from 'consts/ui';
import disableGestures from 'core/browserHacks/disableGestures';
import disableOverscrollNav from 'core/browserHacks/disableOverscrollNav';
import momentumScrollHack from 'core/browserHacks/momentumScrollHack';
import handleBrowserSize from 'core/browserHacks/handleBrowserSize';
import { requestIdleCallback } from 'utils/requestIdleCallback';

import 'styles/vendors/fonts.scss';

requestIdleCallback(() => {
  if (!DISABLE_BROWSER_HACKS) {
    disableGestures();
    disableOverscrollNav();
    momentumScrollHack();
  }
  handleBrowserSize();
}, { timeout: 2000 });

// Use "/* webpackChunkName: 'deferred' */" to include in deferred chunk
export {};
