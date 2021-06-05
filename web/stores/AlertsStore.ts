export type Alert = {
  id: number,
  title: string,
  msg: string | ReactElement,
  closeable: boolean,
  closeAfter: number | null,
  showOk: boolean,
  okText: string | null,
  onOk: (() => void) | null,
  showCancel: boolean,
  cancelText: string | null,
  onCancel: (() => void) | null,
  onClose: (() => void) | null,
};

let _nextAlertId = 0;

const [
  AlertsProvider,
  useAlertsStore,
  useShowAlert,
  useShowConfirm,
] = constate(
  function AlertsStore() {
    const [alerts, setAlerts] = useState([] as Alert[]);

    const showAlert = useCallback(({
      msg = '',
      title = '',
      closeable = true,
      closeAfter = null as number | null,
      showOk = true,
      okText = 'OK',
      onOk = null as (() => void) | null,
      showCancel = false,
      cancelText = 'Cancel',
      onCancel = null as (() => void) | null,
      onClose = null as (() => void) | null,
    }: Partial<Omit<Alert, 'id'>>) => {
      const alertId = _nextAlertId;
      _nextAlertId++;

      setAlerts(arr => [...arr, {
        id: alertId,
        title,
        msg,
        closeable,
        closeAfter,
        showOk,
        okText,
        onOk,
        showCancel,
        cancelText,
        onClose,
        onCancel,
      }]);

      if (closeAfter !== null) {
        window.setTimeout(() => {
          setAlerts(arr => arr.filter(a => a.id !== alertId));
        }, closeAfter);
      }
    }, [setAlerts]);

    const showConfirm = useCallback(async (
      props: Partial<Omit<Alert, 'id'>>,
    ) => new Promise(succ => {
      showAlert({
        onOk() {
          succ(true);
        },
        onClose() {
          succ(false);
        },
        ...props,
      });
    }), [showAlert]);

    const hideFirstAlert = useCallback(() => {
      setAlerts(arr => arr.slice(1));
    }, [setAlerts]);

    return useDeepMemoObj({
      alerts,
      showAlert,
      showConfirm,
      hideFirstAlert,
    });
  },
  function AlertsStore(val) {
    return val;
  },
  function ShowAlert(val) {
    return val.showAlert;
  },
  function ShowConfirm(val) {
    return val.showConfirm;
  },
);

export { AlertsProvider, useAlertsStore, useShowAlert, useShowConfirm };
