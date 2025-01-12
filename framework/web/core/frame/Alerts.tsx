import {
  type Alert,
  alertsAtom,
  hideLastAlert,
  AlertProvider,
} from 'stores/AlertStore';
import usePrevious from 'utils/usePrevious';
import useUpdate from 'utils/useUpdate';
import AlertInner from './AlertInner';

import styles from './Alerts.scss';

function AlertWrap({ alert, children }: React.PropsWithChildren<{ alert: Alert }>) {
  const alerts = useAtomValue(alertsAtom);

  return (
    <div
      onClick={alert.closeable !== false
        ? () => {
          alert.onClose?.();
          hideLastAlert();
        }
        : undefined}
      className={cx(styles.overlay, {
        [styles.visible]: alerts.length,
      })}
      role="dialog"
    >
      {children}
    </div>
  );
}

// todo: mid/mid warn before closing alert
export default function Alerts() {
  const ref = useRef({
    isHiding: false,
    hideTimer: -1,
  });
  const alerts = useAtomValue(alertsAtom);
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
    return (
      <AlertWrap alert={TS.defined(alerts.at(-1))}>
        {alerts.map(alert => (
          <AlertProvider
            key={alert.id}
            alert={alert}
          >
            {alert.elem ?? <AlertInner />}
          </AlertProvider>
        ))}
      </AlertWrap>
    );
  }

  const prevAlert = prevAlerts?.at(-1);
  return prevAlert
    ? (
      <AlertWrap alert={prevAlert}>
        <AlertProvider alert={prevAlert}>
          {prevAlert.elem ?? <AlertInner />}
        </AlertProvider>
      </AlertWrap>
    )
    : null;
}
