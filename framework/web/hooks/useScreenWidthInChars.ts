// Estimates the number of characters that fit on a single lines
export default function useScreenWidthInChars() {
  const { width: windowWidth } = useWindowSize();

  return useGlobalMemo(
    'useScreenWidthInChars',
    () => {
      const elem = document.createElement('div');
      elem.textContent = 'qwertyuiopasdfghjklzxcvbnm';
      elem.style.position = 'fixed';
      // Can't use rem because this might load before css
      elem.style.fontSize = '16px';
      elem.style.fontFamily = 'arial';
      document.body.append(elem);

      const elemWidth = elem.getBoundingClientRect().width;
      elem.remove();

      const widthInChars = windowWidth / (elemWidth / 26);
      return Math.max(1, widthInChars);
    },
    [windowWidth],
  );
}
