export default function disableGestures() {
  document.addEventListener('gesturestart', e => {
    e.preventDefault();
  });

  document.addEventListener('gesturechange', e => {
    e.preventDefault();
  });

  document.addEventListener('dragstart', e => {
    const tagName = e.target instanceof HTMLElement ? e.target.tagName : null;
    if (tagName && (tagName === 'A' || tagName === 'IMG')) {
      e.preventDefault();
    }
  });

  // Can't disable long press vibration: https://github.com/ionic-team/capacitor/issues/4267
  // "addEventListener('contextmenu')" and "-webkit-touch-callout: none" don't work
}
