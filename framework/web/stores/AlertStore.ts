import { getDefaultStore } from 'jotai';

import { addPopHandler, removePopHandler } from 'stores/history/HistoryStore';

export type Alert = {
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

export const alertsAtom = atom<Alert[]>(EMPTY_ARR);

export const disabledOkAlertAtom = atom<Nullish<number>>(null);

let _nextAlertId = 0;

function handlePopHistory() {
  const store = getDefaultStore();
  const alerts = store.get(alertsAtom);
  if (alerts.length) {
    store.set(alertsAtom, EMPTY_ARR);
    return true;
  }
  return false;
}

export const showAlert = markStable(function showAlert(
  props: ReactElement | Partial<Alert>,
  opts?: { closeAfter?: number },
) {
  const isElem = React.isValidElement(props);
  const alertId = _nextAlertId;
  _nextAlertId++;

  const store = getDefaultStore();
  store.set(alertsAtom, arr => [
    ...arr,
    isElem
      ? {
        id: alertId,
        elem: props,
        closeAfter: opts?.closeAfter,
      }
      : {
        id: alertId,
        ...props,
      },
  ]);

  addPopHandler(handlePopHistory);

  const closeAfter = isElem ? opts?.closeAfter : (props as Partial<Alert>).closeAfter;
  if (closeAfter != null) {
    setTimeout(() => {
      requestAnimationFrame(() => {
        store.set(
          alertsAtom,
          arr => arr.filter(a => a.id !== alertId),
        );
      });
    }, closeAfter);
  }
});

export const showConfirm = markStable(function showConfirm(props:
  | ({ title?: string, msg: ReactElement, closeAfter?: number } & {
    [key in Exclude<keyof Alert, 'title' | 'msg' | 'closeAfter'>]?: never;
  })
  | Partial<Omit<Alert, 'id' | 'msg' | 'onOk' | 'onClose'> & { msg: string }>,
) {
  return new Promise<boolean>(succ => {
    // @ts-expect-error valid union
    showAlert({
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

export const hideLastAlert = markStable(function hideLastAlert() {
  getDefaultStore().set(
    alertsAtom,
    arr => (arr.length <= 1 ? EMPTY_ARR : arr.slice(0, -1)),
  );

  removePopHandler(handlePopHistory);
});

export const [
  AlertProvider,
  useAlertStore,
] = constate(function AlertStore({ alert }: { alert: Alert }) {
  return alert;
});
