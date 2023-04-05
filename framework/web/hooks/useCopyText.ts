import { Clipboard } from '@capacitor/clipboard';

export default function useCopyText() {
  const showToast = useShowToast();
  return useCallback((str: string) => {
    try {
      Clipboard.write({ string: str })
        .then(() => {
          showToast({ msg: 'Copied' });
        })
        .catch(err => {
          ErrorLogger.warn(err, { ctx: useCopyText });
          showToast({ msg: 'Failed to copy' });
        });
    } catch {
      showToast({ msg: 'Failed to copy' });
    }
  }, [showToast]);
}
