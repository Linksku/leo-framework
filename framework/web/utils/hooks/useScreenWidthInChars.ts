import useWindowSize from 'utils/hooks/useWindowSize';

// Estimates the number of characters that fit on a single lines
export default function useScreenWidthInChars() {
  const { width: windowWidth } = useWindowSize();

  return useMemo(() => {
    const elem = document.createElement('div');
    elem.textContent = 'qwertyuiopasdfghjklzxcvbnm';
    elem.style.position = 'fixed';
    elem.style.fontSize = '1rem';
    document.body.append(elem);

    const elemWidth = elem.getBoundingClientRect().width;
    elem.remove();

    const widthInChars = windowWidth / (elemWidth / 26);
    return Math.max(1, widthInChars);
  }, [windowWidth]);
}
