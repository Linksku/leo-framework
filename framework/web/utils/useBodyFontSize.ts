import useWindowSize from 'core/globalState/useWindowSize';

export default function useBodyFontSize() {
  const { width } = useWindowSize();

  return useGlobalMemo(
    'useBodyFontSize',
    () => {
      const val = window.getComputedStyle(document.body).getPropertyValue('font-size');
      return TS.parseIntOrNull(val) ?? 16;
    },
    [width],
  );
}
