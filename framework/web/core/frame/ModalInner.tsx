import {
  type Modal,
  modalsAtom,
  disabledOkModalAtom,
  hideLastModal,
  useModalStore,
} from 'stores/ModalStore';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import useEffectInitialMount from 'utils/useEffectInitialMount';

import styles from './ModalInner.scss';

export default function ModalInner(props: React.PropsWithChildren<
  Omit<Modal, 'id' | 'closeAfter'> & {
    textAlign?: 'center' | 'left',
  }
>) {
  const modals = useAtomValue(modalsAtom);
  const [disabledOkModal, setDisabledOkModal] = useAtom(disabledOkModalAtom);

  const {
    id,
    title,
    msg,
    textAlign = 'center',
    closeable = true,
    confirmBeforeClose = false,
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
    ...useModalStore(),
    ...props,
  };
  const disabled = !modals.length;

  useEffectInitialMount(() => {
    const titleOrMsg = title || msg;
    EventLogger.track('Modal', { titleOrMsg });
  });

  function hideModal() {
    onClose?.();
    hideLastModal();
  }

  const handleOk = () => {
    if (disabled) {
      return;
    }

    const ret = onOk?.();
    if (ret instanceof Promise) {
      setDisabledOkModal(id);
      ret
        .then(ret2 => {
          if (ret2 !== false) {
            hideModal();
          }
        })
        .catch(err => {
          ErrorLogger.warn(err);
        })
        .finally(() => {
          // Intentionally use stale modal
          setDisabledOkModal(s => (s === id ? null : s));
        });
    } else if (ret !== false) {
      hideModal();
    }
  };

  const handleCancel = async () => {
    if (disabled) {
      return;
    }

    if (confirmBeforeClose
      && !await showConfirm({ msg: 'Are you sure you want to close?' })) {
      return;
    }

    onCancel?.();
    hideModal();
  };

  const msgOrChildren = children ?? msg;
  const showBtns = closeable && (showOk || showCancel);
  return (
    <div
      className={styles.modal}
      style={{
        textAlign: textAlign ?? (typeof msgOrChildren === 'string'
          ? 'center'
          : 'left'),
      }}
      onClick={event => event.stopPropagation()}
      role="dialog"
    >
      {title && <h2 className={styles.title}>{title}</h2>}
      {msgOrChildren && (
        <ErrorBoundary
          loadingElem={(
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
              disabled={disabled || disabledOkModal === id}
              fullWidth
              data-testid={TestIds.modalOkBtn}
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
