export type Alert = {
  id: number,
  title: string,
  msg: string | ReactElement,
  textAlign: 'center' | 'left' | 'right',
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
    const shownRef = useRef(!!alerts.length);
    const { addPopHandler } = useHistoryStore();

    const showAlert = useCallback(({
      title = '',
      msg = '',
      textAlign = 'center',
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
        textAlign,
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

      addPopHandler(() => {
        if (shownRef.current) {
          setAlerts([]);
          return true;
        }
        return false;
      });

      if (closeAfter !== null) {
        setTimeout(() => {
          requestAnimationFrame(() => {
            setAlerts(arr => arr.filter(a => a.id !== alertId));
          });
        }, closeAfter);
      }
    }, [setAlerts, addPopHandler]);

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

    useEffect(() => {
      shownRef.current = !!alerts.length;
    }, [alerts.length]);

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
