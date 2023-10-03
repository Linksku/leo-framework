import { useAddPopHandler } from './HistoryStore';

export type Alert = {
  id: number,
  title: string,
  msg: string | ReactElement,
  textAlign: 'center' | 'left' | 'right',
  closeable: boolean,
  closeAfter: number | null,
  showOk: boolean,
  okText: string | null,
  okBtnProps: Parameters<typeof Button>[0] | null,
  onOk: (() => boolean | void | Promise<boolean | void>) | null,
  showCancel: boolean,
  cancelText: string | null,
  cancelBtnProps: Parameters<typeof Button>[0] | null,
  onCancel: (() => void) | null,
  onClose: (() => void) | null,
};

let _nextAlertId = 0;

export const [
  AlertsProvider,
  useAlertsStore,
  useShowAlert,
  useShowConfirm,
] = constate(
  function AlertsStore() {
    const [alerts, setAlerts] = useState([] as Alert[]);
    const shownRef = useRef(!!alerts.length);
    const addPopHandler = useAddPopHandler();

    const showAlert = useCallback(({
      title = '',
      msg = '',
      textAlign = 'center',
      closeable = true,
      closeAfter = null,
      showOk = true,
      okText = 'OK',
      okBtnProps = null,
      onOk = null,
      showCancel = false,
      cancelText = 'Cancel',
      cancelBtnProps = null,
      onCancel = null,
      onClose = null,
    }: Partial<Omit<Alert, 'id'>>) => {
      const alertId = _nextAlertId;
      _nextAlertId++;

      setAlerts(arr => [...arr, {
        id: alertId,
        title,
        msg: typeof msg === 'string'
          ? msg
          : React.cloneElement(msg, { key: alertId }),
        textAlign,
        closeable,
        closeAfter,
        showOk,
        okText,
        okBtnProps,
        onOk,
        showCancel,
        cancelText,
        cancelBtnProps,
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

    const showConfirm = useCallback((
      props: Partial<Omit<Alert, 'id'>>,
    ) => new Promise<boolean>(succ => {
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

    const hideLastAlert = useCallback(() => {
      setAlerts(arr => arr.slice(0, -1));
    }, [setAlerts]);

    const hasAlerts = alerts.length > 0;
    useEffect(() => {
      shownRef.current = hasAlerts;
    }, [hasAlerts]);

    return useMemo(() => ({
      alerts,
      showAlert,
      showConfirm,
      hideLastAlert,
    }), [alerts, showAlert, showConfirm, hideLastAlert]);
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
