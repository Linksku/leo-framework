import usePrevious from 'react-use/lib/usePrevious';
import useUpdate from 'lib/hooks/useUpdate';

import styles from './AlertsStyles.scss';

function Alerts() {
  const ref = useRef({
    isHiding: false,
    hideTimer: -1,
  });
  const { alerts, hideFirstAlert } = useAlertsStore();
  const disabled = !alerts.length;
  const prevAlerts = usePrevious(alerts);
  const update = useUpdate();

  const {
    title,
    msg,
    textAlign,
    closeable,
    showOk,
    okText,
    onOk,
    showCancel,
    cancelText,
    onCancel,
    onClose,
  } = alerts[0] ?? prevAlerts?.[0] ?? {};

  const startHiding = !!prevAlerts?.length && !alerts.length && !ref.current.isHiding;
  useEffect(() => {
    if (startHiding) {
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
  }, [startHiding, alerts, update]);

  if (!alerts.length && !ref.current.isHiding && !startHiding) {
    return null;
  }

  function hideAlert() {
    onClose?.();
    hideFirstAlert();
  }

  const handleOk = () => {
    if (disabled) {
      return;
    }
    onOk?.();
    hideAlert();
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
      className={cn(styles.container, {
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
        {title
          ? <h2 className={styles.title}>{title}</h2>
          : null}
        {msg
          ? <div className={styles.msg}>{msg}</div>
          : null}

        {closeable && (showOk || showCancel)
          ? (
            <div className={styles.btns}>
              {closeable && showOk
                ? (
                  <Button
                    label={okText}
                    onClick={handleOk}
                    disabled={disabled}
                    fullWidth
                  />
                )
                : null}
              {closeable && showOk && showCancel
                ? (
                  <div className={styles.btnSeparator} />
                )
                : null}
              {closeable && showCancel
                ? (
                  <Button
                    label={cancelText}
                    onClick={handleCancel}
                    disabled={disabled}
                    fullWidth
                    outline
                  />
                )
                : null}
            </div>
          )
          : null}
      </div>
    </div>
  );
}

export default React.memo(Alerts);
