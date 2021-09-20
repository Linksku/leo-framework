import styles from './ToastsStyles.scss';

function Toasts() {
  const { toast, hideToast, isHidingToast } = useToastsStore();

  if (!toast) {
    return null;
  }
  const {
    msg,
  } = toast;

  return (
    <div
      onClick={hideToast}
      className={cn(styles.toast, {
        [styles.visible]: !isHidingToast,
      })}
      role="dialog"
    >
      {msg}
    </div>
  );
}

export default React.memo(Toasts);
