import {
  type Modal,
  modalsAtom,
  hideLastModal,
  ModalProvider,
} from 'stores/ModalStore';
import usePrevious from 'utils/usePrevious';
import useUpdate from 'utils/useUpdate';
import ModalInner from './ModalInner';
import ErrorBoundary from './ErrorBoundary';

import styles from './Modals.scss';

function ModalWrap({ modal, children }: React.PropsWithChildren<{ modal: Modal }>) {
  const modals = useAtomValue(modalsAtom);

  return (
    <div
      onClick={modal.closeable !== false
        ? async () => {
          if (modal.confirmBeforeClose
            && !await showConfirm({ msg: 'Are you sure you want to close?' })) {
            return;
          }

          modal.onClose?.();
          hideLastModal();
        }
        : undefined}
      className={cx(styles.overlay, {
        [styles.visible]: modals.length,
      })}
      role="dialog"
    >
      <ErrorBoundary
        loadingElem={(
          <ModalProvider modal={modal}>
            <ModalInner okText="Close">
              <Spinner verticalMargin={50} />
            </ModalInner>
          </ModalProvider>
        )}
        renderError={msg => (
          <ModalProvider modal={modal}>
            <ModalInner msg={msg} okText="Close">
              {msg}
            </ModalInner>
          </ModalProvider>
        )}
      >
        {children}
      </ErrorBoundary>
    </div>
  );
}

export default function Modals() {
  const ref = useRef({
    isHiding: false,
    hideTimer: -1,
  });
  const modals = useAtomValue(modalsAtom);
  const prevModals = usePrevious(modals);
  const update = useUpdate();

  const closedAllModals = !!prevModals?.length && !modals.length;
  useEffect(() => {
    if (closedAllModals && !ref.current.isHiding) {
      ref.current.isHiding = true;
      ref.current.hideTimer = window.setTimeout(() => {
        requestAnimationFrame(() => {
          ref.current.isHiding = false;
          update();
        });
      }, 200);
    } else if (modals.length) {
      clearTimeout(ref.current.hideTimer);
      ref.current.isHiding = false;
    }
  }, [closedAllModals, modals, update]);

  if (modals.length) {
    return modals.map(modal => (
      <ModalWrap key={modal.id} modal={modal}>
        <ModalProvider
          key={modal.id}
          modal={modal}
        >
          {modal.elem ?? <ModalInner />}
        </ModalProvider>
      </ModalWrap>
    ));
  }

  // todo: low/easy check modal closing animation
  const prevModal = prevModals?.at(-1);
  return prevModal
    ? (
      <ModalWrap modal={prevModal}>
        <ModalProvider modal={prevModal}>
          {prevModal.elem ?? <ModalInner />}
        </ModalProvider>
      </ModalWrap>
    )
    : null;
}
