import { addPopHandler, removePopHandler } from 'stores/history/HistoryStore';

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
    const [alerts, setAlerts] = useState<Alert[]>(EMPTY_ARR);
    const shownRef = useRef(false);

    const handlePopHistory = useCallback(() => {
      if (shownRef.current) {
        setAlerts(EMPTY_ARR);
        return true;
      }
      return false;
    }, []);

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

      setAlerts(arr => {
        const lastAlert = arr.at(-1);
        if (lastAlert && lastAlert.title === title && lastAlert.msg === msg) {
          if (!process.env.PRODUCTION) {
            ErrorLogger.warn(new Error('AlertsStore: ignored duplicate alert'));
          }
          return arr;
        }

        return [
          ...arr,
          {
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
          },
        ];
      });

      addPopHandler(handlePopHistory);

      if (closeAfter !== null) {
        setTimeout(() => {
          requestAnimationFrame(() => {
            setAlerts(arr => arr.filter(a => a.id !== alertId));
          });
        }, closeAfter);
      }

      const titleOrMsg = title || (typeof msg === 'string' ? msg : null);
      EventLogger.track('Alert', { titleOrMsg });
    }, [handlePopHistory]);

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
      setAlerts(arr => (arr.length <= 1 ? EMPTY_ARR : arr.slice(0, -1)));

      removePopHandler(handlePopHistory);
    }, [handlePopHistory]);

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
