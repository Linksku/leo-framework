import { Keyboard } from '@capacitor/keyboard';

import detectPlatform from 'utils/detectPlatform';

export default function hideVirtualKeyboard() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  if (navigator.virtualKeyboard) {
    navigator.virtualKeyboard.hide();
  } else if (detectPlatform().isNative) {
    Keyboard.hide()
      .catch(err => {
        ErrorLogger.warn(err, { ctx: 'Keyboard.hide' });
      });
  }
}
