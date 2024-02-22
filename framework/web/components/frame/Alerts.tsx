import type { Alert } from 'stores/AlertsStore';
import usePrevious from 'hooks/usePrevious';
import useUpdate from 'hooks/useUpdate';
import ErrorBoundary from 'components/ErrorBoundary';

import styles from './Alerts.scss';

export default function Alerts() {
  const ref = useRef({
    isHiding: false,
    hideTimer: -1,
  });
  const [disabledOkAlert, setDisabledOkAlert] = useState<Alert | null>(null);
  const { alerts, hideLastAlert } = useAlertsStore();
  const disabled = !alerts.length;
  const prevAlerts = usePrevious(alerts);
  const update = useUpdate();

  const closedAllAlerts = !!prevAlerts?.length && !alerts.length;
  useEffect(() => {
    if (closedAllAlerts && !ref.current.isHiding) {
      ref.current.isHiding = true;
      ref.current.hideTimer = window.setTimeout(() => {
        requestAnimationFrame(() => {
          ref.current.isHiding = false;
          update();
        });
      }, 200);
    } else if (alerts.length) {
      clearTimeout(ref.current.hideTimer);
      ref.current.isHiding = false;
    }
  }, [closedAllAlerts, alerts, update]);

  const curAlert = alerts.at(-1) ?? prevAlerts?.at(-1);
  if (!curAlert) {
    return null;
  }

  const {
    title,
    msg,
    textAlign,
    closeable,
    showOk,
    okText,
    okBtnProps,
    onOk,
    showCancel,
    cancelText,
    cancelBtnProps,
    onCancel,
    onClose,
  } = curAlert;

  function hideAlert() {
    onClose?.();
    hideLastAlert();
  }

  const handleOk = () => {
    if (disabled) {
      return;
    }

    const ret = onOk?.();
    if (ret instanceof Promise) {
      setDisabledOkAlert(curAlert);
      ret
        .then(ret2 => {
          if (ret2 !== false) {
            hideAlert();
          }
        })
        .catch(err => {
          ErrorLogger.warn(err);
        })
        .finally(() => {
          // Intentionally use stale curAlert
          setDisabledOkAlert(s => (s === curAlert ? null : s));
        });
    } else if (ret !== false) {
      hideAlert();
    }
  };

  const handleCancel = () => {
    if (disabled) {
      return;
    }
    onCancel?.();
    hideAlert();
  };

  return (
    <div
      onClick={closeable ? hideAlert : undefined}
      className={cx(styles.container, {
        [styles.visible]: alerts.length,
      })}
      role="dialog"
    >
      <div
        className={styles.alert}
        style={{ textAlign }}
        onClick={event => event.stopPropagation()}
        role="dialog"
      >
        {title && <h2 className={styles.title}>{title}</h2>}
        {msg && (
          <ErrorBoundary>
            <div className={styles.msg}>
              {typeof msg === 'string'
                ? <p>{msg}</p>
                : msg}
            </div>
          </ErrorBoundary>
        )}

        {closeable && (showOk || showCancel) && (
          <div className={styles.btns}>
            {closeable && showOk && (
              <Button
                label={okText}
                onClick={handleOk}
                disabled={disabled || disabledOkAlert === curAlert}
                fullWidth
                {...okBtnProps}
              />
            )}
            {closeable && showOk && showCancel && (
              <div className={styles.btnSeparator} />
            )}
            {closeable && showCancel && (
              <Button
                label={cancelText}
                onClick={handleCancel}
                disabled={disabled}
                fullWidth
                outline
                {...cancelBtnProps}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
