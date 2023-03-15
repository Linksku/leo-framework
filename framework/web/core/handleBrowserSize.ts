import throttle from 'utils/throttle';

if (TS.hasProp(navigator, 'virtualKeyboard')) {
  (navigator.virtualKeyboard as any).overlaysContent = false;
}

let timer: number | null = null;
function _setVh100() {
  // Note: on Android, after re-opening screen, height can be wrong
  document.documentElement.style.setProperty(
    '--vh100',
    `${window.innerHeight}px`,
  );
}

export default function handleBrowserSize() {
  _setVh100();

  const handleResize = throttle(
    () => {
      requestAnimationFrame(() => {
        _setVh100();

        // Move screen back after opening mobile keyboard
        window.scrollTo(0, 0);
      });

      if (timer) {
        clearTimeout(timer);
      }
      // Note: on iOS, height doesn't update immediately
      timer = setTimeout(_setVh100, 100);
    },
    { timeout: 100 },
  );

  const handleResizeViewport = throttle(
    () => {
      requestAnimationFrame(() => {
        const isKeyboardOpen = window.visualViewport?.height
          && window.visualViewport.height < document.documentElement.clientHeight - 100;
        if (isKeyboardOpen) {
          document.documentElement.style.setProperty('--safe-area-inset-bottom', '0px');
        } else {
          document.documentElement.style.removeProperty('--safe-area-inset-bottom');
        }
      });
    },
    { timeout: 100 },
  );

  window.addEventListener('resize', handleResize);
  window.addEventListener('focus', handleResize);
  window.visualViewport?.addEventListener('resize', handleResizeViewport);
}
