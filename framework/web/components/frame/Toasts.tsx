import styles from './ToastsStyles.scss';

export default React.memo(function Toasts() {
  const { toast, hideToast, isHidingToast } = useToastsStore();

  if (!toast) {
    return null;
  }
  const {
    msg,
  } = toast;

  return (
    <div className={styles.toastWrap}>
      <div
        onClick={hideToast}
        className={cx(styles.toast, {
          [styles.visible]: !isHidingToast,
        })}
        role="dialog"
      >
        {msg}
      </div>
    </div>
  );
});
