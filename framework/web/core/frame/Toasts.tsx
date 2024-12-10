import styles from './Toasts.scss';

export default function Toasts() {
  const { toast, hideToast, isHidingToast } = useToastsStore();

  if (!toast) {
    return null;
  }
  return (
    <div className={styles.toastWrap}>
      <div
        onClick={hideToast}
        className={cx(styles.toast, {
          [styles.visible]: !isHidingToast,
        })}
        role="dialog"
      >
        {toast.msg}
      </div>
    </div>
  );
}
