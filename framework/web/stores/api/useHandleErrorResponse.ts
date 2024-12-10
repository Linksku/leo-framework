import ApiError from 'core/ApiError';

let lastShowAlertTime = Number.MIN_SAFE_INTEGER;

export default function useHandleErrorResponse() {
  const showToast = useShowToast();
  const showAlert = useShowAlert();
  const reloadPage = useReloadPage();

  return useCallback((err: Error, showToastOnError = true) => {
    if (err instanceof ApiError && err.status === 429) {
      if (showToastOnError || !err.message) {
        showToast({
          msg: err.message || 'Received too many requests, please try again later.',
          closeAfter: 5000,
        });
      }
      return;
    }

    if (err instanceof ApiError && err.status === 469) {
      // Client is using old JS files
      if (performance.now() - lastShowAlertTime > 60 * 1000) {
        showAlert({
          title: 'New app version available',
          okText: 'Reload to Update',
          onOk() {
            reloadPage();
            return new Promise(NOOP);
          },
          showCancel: true,
          cancelText: 'Ignore',
        });
        lastShowAlertTime = performance.now();
      }
      return;
    }

    ErrorLogger[
      process.env.PRODUCTION ? 'warn' : 'error'
    ](
      err,
      undefined,
      true,
      !(err instanceof ApiError) || err.status >= 500,
    );

    if (showToastOnError && err.message) {
      if (!process.env.PRODUCTION && err.message.includes(': ')) {
        ErrorLogger.warn(
          new Error('useHandleErrorResponse: error context would be shown in prod'),
          { msg: err.message },
        );
      }

      // Fixes "server temporarily unavailable" when tab is hidden
      if (!document.hidden) {
        showToast({
          msg: err.message,
          closeAfter: 5000,
        });
      }
    }
  }, [showToast, showAlert, reloadPage]);
}
