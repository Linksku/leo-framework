import useCopyText from './useCopyText';
import useLongPress from './useLongPress';

export default function useHoldToCopy(str: string) {
  const copyText = useCopyText();

  return useLongPress(() => {
    copyText(str);
  });
}
