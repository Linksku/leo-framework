import {
  type Alert,
  alertsAtom,
  disabledOkAlertAtom,
  hideLastAlert,
  useAlertStore,
} from 'stores/AlertStore';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import useEffectInitialMount from 'utils/useEffectInitialMount';

import styles from './AlertInner.scss';

export default function AlertInner(props: React.PropsWithChildren<
  Omit<Alert, 'id' | 'closeAfter'>
>) {
  const alerts = useAtomValue(alertsAtom);
  const [disabledOkAlert, setDisabledOkAlert] = useAtom(disabledOkAlertAtom);

  const {
    id,
    title,
    msg,
    closeable = true,
    showOk = true,
    okText = 'OK',
    okBtnProps,
    onOk,
    showCancel,
    cancelText = 'Cancel',
    cancelBtnProps,
    onCancel,
    onClose,
    children,
  } = {
    ...useAlertStore(),
    ...props,
  };
  const disabled = !alerts.length;

  useEffectInitialMount(() => {
    const titleOrMsg = title || msg;
    EventLogger.track('Alert', { titleOrMsg });
  });

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
      setDisabledOkAlert(id);
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
          setDisabledOkAlert(s => (s === id ? null : s));
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

  const msgOrChildren = children ?? msg;
  const showBtns = closeable && (showOk || showCancel);
  return (
    <div
      className={styles.alert}
      style={{ textAlign: typeof msg === 'string' ? 'center' : 'left' }}
      onClick={event => event.stopPropagation()}
      role="dialog"
    >
      {title && <h2 className={styles.title}>{title}</h2>}
      {msgOrChildren && (
        <ErrorBoundary
          Loading={(
            <div className={styles.loading}>
              <Spinner verticalMargin={50} />
            </div>
          )}
        >
          <div
            className={cx(styles.msg, {
              [styles.simpleMsg]: typeof msgOrChildren === 'string',
              [styles.hasBottomBtns]: showBtns,
            })}
          >
            {typeof msgOrChildren === 'string'
              ? <p>{msgOrChildren}</p>
              : msgOrChildren}
          </div>
        </ErrorBoundary>
      )}

      {showBtns && (
        <div className={styles.btns}>
          {closeable && showOk && (
            <Button
              label={okText}
              onClick={handleOk}
              disabled={disabled || disabledOkAlert === id}
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
  );
}
