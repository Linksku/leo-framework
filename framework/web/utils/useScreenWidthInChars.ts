import useWindowSize from 'core/globalState/useWindowSize';

// Estimates the number of characters that fit on a single lines
// Some browsers like FF will scale text based on system settings
export default function useScreenWidthInChars() {
  const { width: windowWidth } = useWindowSize();

  return useGlobalMemo(
    'useScreenWidthInChars',
    () => {
      const elem = document.createElement('div');
      elem.textContent = 'qwertyuiopasdfghjklzxcvbnm';
      elem.style.position = 'fixed';
      // Can't use rem because this might load before css
      // todo: low/mid get actual size using rem
      elem.style.fontSize = '16px';
      // Shouldn't use Inter Tight because it might not be loaded
      elem.style.fontFamily = 'arial,sans-serif';
      document.body.append(elem);

      const elemWidth = elem.getBoundingClientRect().width;
      elem.remove();

      const widthInChars = windowWidth / (elemWidth / 26);
      return Math.max(1, widthInChars);
    },
    [windowWidth],
  );
}
