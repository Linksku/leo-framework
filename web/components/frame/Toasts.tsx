import usePrevious from 'react-use/lib/usePrevious';
import useUpdate from 'react-use/lib/useUpdate';

import styles from './ToastsStyles.scss';

function Toasts() {
  const ref = useRef({
    isHiding: false,
    hideTimer: -1,
  });
  const { toasts, hideFirstToast } = useToastsStore();
  const prevToasts = usePrevious(toasts);
  const update = useUpdate();

  const {
    msg,
  } = toasts[0] ?? prevToasts?.[0] ?? {};

  const startHiding = !!prevToasts?.length && !toasts.length && !ref.current.isHiding;
  useEffect(() => {
    if (startHiding) {
      ref.current.isHiding = true;
      ref.current.hideTimer = window.setTimeout(() => {
        requestAnimationFrame(() => {
          ref.current.isHiding = false;
          update();
        });
      }, 200);
    } else if (toasts.length) {
      clearTimeout(ref.current.hideTimer);
      ref.current.isHiding = false;
    }
  }, [startHiding, update, toasts]);

  if (!toasts.length && !ref.current.isHiding && !startHiding) {
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
