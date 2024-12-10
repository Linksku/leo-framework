import type { Alert } from 'stores/AlertsStore';
import usePrevious from 'utils/usePrevious';
import useUpdate from 'utils/useUpdate';
import ErrorBoundary from 'core/frame/ErrorBoundary';

import styles from './Alerts.scss';

function SingleAlert({ alert, disabledOkAlert, setDisabledOkAlert }: {
  alert: Alert,
  disabledOkAlert: Alert | null,
  setDisabledOkAlert: SetState<Alert | null>,
}) {
  const { alerts, hideLastAlert } = useAlertsStore();
  const disabled = !alerts.length;

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
  } = alert;

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
      setDisabledOkAlert(alert);
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
          // Intentionally use stale alert
          setDisabledOkAlert(s => (s === alert ? null : s));
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

  const showBtns = closeable && (showOk || showCancel);
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
          <ErrorBoundary
            Loading={(
              <div className={styles.loading}>
                <Spinner verticalMargin={50} />
              </div>
            )}
          >
            <div
              className={cx(styles.msg, {
                [styles.simpleMsg]: typeof msg === 'string',
                [styles.hasBottomBtns]: showBtns,
              })}
            >
              {typeof msg === 'string'
                ? <p>{msg}</p>
                : msg}
            </div>
          </ErrorBoundary>
        )}

        {showBtns && (
          <div className={styles.btns}>
            {closeable && showOk && (
              <Button
                label={okText}
                onClick={handleOk}
                disabled={disabled || disabledOkAlert === alert}
                fullWidth
                data-testid={TestIds.alertOkBtn}
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

// todo: mid/mid warn before closing alert
export default function Alerts() {
  const ref = useRef({
    isHiding: false,
    hideTimer: -1,
  });
  const [disabledOkAlert, setDisabledOkAlert] = useState<Alert | null>(null);
  const { alerts } = useAlertsStore();
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

  if (alerts.length) {
    return alerts.map(alert => (
      <SingleAlert
        key={alert.id}
        alert={alert}
        disabledOkAlert={disabledOkAlert}
        setDisabledOkAlert={setDisabledOkAlert}
      />
    ));
  }

  const lastAlert = prevAlerts?.at(-1);
  return lastAlert
    ? (
      <SingleAlert
        alert={lastAlert}
        disabledOkAlert={disabledOkAlert}
        setDisabledOkAlert={setDisabledOkAlert}
      />
    )
    : null;
}
