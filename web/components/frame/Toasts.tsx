import usePrevious from 'lib/hooks/usePrevious';
import useForceUpdate from 'lib/hooks/useForceUpdate';

import styles from './ToastsStyles.scss';

function Toasts() {
  const ref = useRef({
    isHiding: false,
    hideTimer: -1,
  });
  const { toasts, hideFirstToast } = useToastsStore();
  const prevToasts = usePrevious(toasts);
  const forceUpdate = useForceUpdate();

  const {
    msg,
  } = toasts[0] ?? prevToasts?.[0] ?? {};

  if (prevToasts?.length && !toasts.length && !ref.current.isHiding) {
    ref.current.isHiding = true;
    ref.current.hideTimer = window.setTimeout(() => {
      ref.current.isHiding = false;
      forceUpdate();
    }, 200);
  } else if (toasts.length) {
    clearTimeout(ref.current.hideTimer);
    ref.current.isHiding = false;
  }

  if (!toasts.length && !ref.current.isHiding) {
    return null;
  }

  return (
    <div
      onClick={hideFirstToast}
      className={cn(styles.toast, {
        [styles.visible]: toasts.length,
      })}
      role="dialog"
    >
      {msg}
    </div>
  );
}

export default React.memo(Toasts);
