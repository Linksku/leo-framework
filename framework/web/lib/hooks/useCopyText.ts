import { Clipboard } from '@capacitor/clipboard';

export default function useCopyText() {
  const showToast = useShowToast();
  return useCallback(async (str: string) => {
    try {
      await Clipboard.write({ string: str });
      showToast({ msg: 'Copied' });
    } catch {
      showToast({ msg: 'Fail to copy text' });
    }
  }, [showToast]);
}
