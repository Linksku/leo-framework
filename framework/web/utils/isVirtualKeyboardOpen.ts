export default function isVirtualKeyboardOpen() {
  return window.visualViewport?.height
    && window.visualViewport.height < document.documentElement.clientHeight - 100;
}
