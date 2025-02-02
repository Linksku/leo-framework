import { getDefaultStore } from 'jotai';

import { addPopHandler, removePopHandler } from 'stores/history/HistoryStore';

export type Modal = {
  id: number,
  title?: string,
  msg?: string,
  elem?: ReactElement,
  closeAfter?: number | null,
  closeable?: boolean,
  showOk?: boolean,
  okText?: string,
  okBtnProps?: Parameters<typeof Button>[0] | null,
  onOk?: (() => boolean | void | Promise<boolean | void>) | null,
  showCancel?: boolean,
  cancelText?: string,
  cancelBtnProps?: Parameters<typeof Button>[0],
  onCancel?: (() => void),
  onClose?: (() => void),
};

export const modalsAtom = atom<Modal[]>(EMPTY_ARR);

export const disabledOkModalAtom = atom<Nullish<number>>(null);

let _nextModalId = 0;

function handlePopHistory() {
  const store = getDefaultStore();
  const modals = store.get(modalsAtom);
  if (modals.length) {
    store.set(modalsAtom, EMPTY_ARR);
    return true;
  }
  return false;
}

export const showModal = markStable(function showModal(
  props: ReactElement | Partial<Modal>,
  opts?: { closeAfter?: number },
) {
  const isElem = React.isValidElement(props);
  const modalId = _nextModalId;
  _nextModalId++;

  const store = getDefaultStore();
  store.set(modalsAtom, arr => [
    ...arr,
    isElem
      ? {
        id: modalId,
        elem: props,
        closeAfter: opts?.closeAfter,
      }
      : {
        id: modalId,
        ...props,
      },
  ]);

  addPopHandler(handlePopHistory);

  const closeAfter = isElem ? opts?.closeAfter : props.closeAfter;
  if (closeAfter != null) {
    setTimeout(() => {
      requestAnimationFrame(() => {
        store.set(
          modalsAtom,
          arr => arr.filter(a => a.id !== modalId),
        );
      });
    }, closeAfter);
  }
});

export const showConfirm = markStable(function showConfirm(props:
  | ({ title?: string, msg: ReactElement, closeAfter?: number } & {
    [key in Exclude<keyof Modal, 'title' | 'msg' | 'closeAfter'>]?: never;
  })
  | Partial<Omit<Modal, 'id' | 'msg' | 'onOk' | 'onClose'> & { msg: string }>,
) {
  return new Promise<boolean>(succ => {
    // @ts-expect-error valid union
    showModal({
      ...props,
      onOk() {
        succ(true);
      },
      onClose() {
        succ(false);
      },
    });
  });
});

export const hideLastModal = markStable(function hideLastModal() {
  getDefaultStore().set(
    modalsAtom,
    arr => (arr.length <= 1 ? EMPTY_ARR : arr.slice(0, -1)),
  );

  removePopHandler(handlePopHistory);
});

export const [
  ModalProvider,
  useModalStore,
] = constate(function ModalStore({ modal }: { modal: Modal }) {
  return modal;
});
