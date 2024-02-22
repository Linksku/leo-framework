import { Clipboard } from '@capacitor/clipboard';

export default function useCopyText() {
  const showToast = useShowToast();
  return useCallback((str: string, toast = true) => {
    try {
      Clipboard.write({ string: str })
        .then(() => {
          if (toast) {
            showToast({ msg: 'Copied' });
          }
        })
        .catch(err => {
          ErrorLogger.warn(err, { ctx: 'useCopyText' });

          if (toast) {
            showToast({ msg: 'Failed to copy' });
          }
        });
    } catch {
      if (toast) {
        showToast({ msg: 'Failed to copy' });
      }
    }
  }, [showToast]);
}
