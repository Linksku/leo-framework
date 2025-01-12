import { getDefaultStore } from 'jotai';

export type Toast = {
  id: number,
  msg: string,
  closeAfter: number | null,
};

const DEFAULT_CLOSE_AFTER = 3000;

export const toastAtom = atom<Toast | null>(null);

export const isHidingAtom = atom<boolean>(false);

let _nextToastId = 0;

const ToastsState = {
  hideToastTimer: null as number | null,
  removeToastTimer: null as number | null,
};

export const hideToast = markStable(function hideToast() {
  const store = getDefaultStore();
  store.set(isHidingAtom, true);

  if (ToastsState.removeToastTimer !== null) {
    clearTimeout(ToastsState.removeToastTimer);
  }
  ToastsState.removeToastTimer = window.setTimeout(() => {
    store.set(toastAtom, null);
    store.set(isHidingAtom, false);
  }, 200);
});

export const showToast = markStable(function showToast({
  msg = '',
  closeAfter = null as number | null,
}: Partial<Omit<Toast, 'id'>>) {
  const toastId = _nextToastId;
  _nextToastId++;

  const store = getDefaultStore();
  store.set(toastAtom, {
    id: toastId,
    msg,
    closeAfter,
  });
  store.set(isHidingAtom, false);

  if (ToastsState.hideToastTimer !== null) {
    clearTimeout(ToastsState.hideToastTimer);
  }
  ToastsState.hideToastTimer = window.setTimeout(
    hideToast,
    closeAfter ?? DEFAULT_CLOSE_AFTER,
  );
});
