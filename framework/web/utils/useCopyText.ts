import retryImport from 'utils/retryImport';

export default function useCopyText(): (
  str: string,
  toastMsg?: string | boolean,
) => void {
  return useCallback((
    str: string,
    toastMsg: string | boolean = true,
  ) => {
    try {
      retryImport(() => import(
        /* webpackChunkName: 'capacitor/clipboard' */ '@capacitor/clipboard'
      ))
        .then(module => module.Clipboard.write({ string: str }))
        .then(() => {
          if (toastMsg) {
            showToast({ msg: typeof toastMsg === 'string' ? toastMsg : 'Copied' });
          }
        })
        .catch(err => {
          ErrorLogger.warn(err, { ctx: 'useCopyText' });

          if (toastMsg) {
            showToast({ msg: 'Failed to copy' });
          }
        });
    } catch {
      if (toastMsg) {
        showToast({ msg: 'Failed to copy' });
      }
    }
  }, []);
}
