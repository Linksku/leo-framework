export default function useHandleErrorResponse() {
  const showToast = useShowToast();
  const showAlert = useShowAlert();
  const reloadPage = useReloadPage();

  return useCallback(({
    caller,
    name,
    showToastOnError = true,
    status,
    err,
  }: {
    caller: string,
    name: string,
    showToastOnError?: boolean,
    status: Nullish<number>,
    err: Error,
  }) => {
    ErrorLogger.warning(err, `${caller}(${name}): ${status}`);

    if (status === 429) {
      // Too many requests.
      showToast({
        msg: 'Received too many requests, please try again later.',
        closeAfter: 5000,
      });
    } else if (status === 469) {
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
    } else if (showToastOnError && err.message) {
      showToast({
        msg: err.message,
      });
    }
  }, [showToast, showAlert, reloadPage]);
}
