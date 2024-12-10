import { Keyboard } from '@capacitor/keyboard';

import detectPlatform from 'utils/detectPlatform';

let isOpen = false;

if (detectPlatform().isNative && !window.visualViewport) {
  Keyboard.addListener('keyboardDidShow', () => {
    isOpen = true;
  })
    .catch(err => {
      ErrorLogger.warn(err, { ctx: 'Keyboard.keyboardDidShow' });
    });

  Keyboard.addListener('keyboardDidHide', () => {
    isOpen = false;
  })
    .catch(err => {
      ErrorLogger.warn(err, { ctx: 'Keyboard.keyboardDidHide' });
    });
}

export default function isVirtualKeyboardOpen() {
  return window.visualViewport
    ? window.visualViewport.height < document.documentElement.clientHeight - 100
    : isOpen;
}
