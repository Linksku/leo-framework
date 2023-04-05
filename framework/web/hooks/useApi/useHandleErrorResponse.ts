import ApiError from 'core/ApiError';

export default function useHandleErrorResponse() {
  const showToast = useShowToast();
  const showAlert = useShowAlert();
  const reloadPage = useReloadPage();

  return useCallback((err: Error, showToastOnError = true) => {
    if (err instanceof ApiError && err.status === 429) {
      // Too many requests.
      showToast({
        msg: 'Received too many requests, please try again later.',
        closeAfter: 5000,
      });
      return;
    }

    if (err instanceof ApiError && err.status === 469) {
      // Client is outdated.
      showAlert({
        title: 'New app version available',
        okText: 'Reload to Update',
        onOk() {
          reloadPage();
        },
        showCancel: true,
        cancelText: 'Ignore',
      });
      return;
    }

    ErrorLogger[
      process.env.PRODUCTION ? 'warn' : 'error'
    ](
      err,
      undefined,
      false,
    );

    if (showToastOnError && err.message) {
      showToast({
        msg: err.message,
        closeAfter: 5000,
      });
    }
  }, [showToast, showAlert, reloadPage]);
}
