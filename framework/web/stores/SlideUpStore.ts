import { getDefaultStore } from 'jotai';

import { addPopHandler, removePopHandler } from 'stores/history/HistoryStore';
import { DEFAULT_POST_API_TIMEOUT } from 'consts/server';

export const shownAtom = atom(false);

export const elemAtom = atom<Stable<ReactElement> | null>(null);

const ref = {
  numShown: 0,
  hideTimer: null as number | null,
};

function hideSlideUpRaw(instant?: boolean) {
  if (ref.hideTimer) {
    clearTimeout(ref.hideTimer);
    ref.hideTimer = null;
  }

  const store = getDefaultStore();
  if (instant) {
    store.set(shownAtom, false);
    store.set(elemAtom, null);
  } else {
    store.set(shownAtom, false);
    ref.hideTimer = window.setTimeout(() => {
      store.set(elemAtom, null);
      // Wait for APIs to complete
    }, DEFAULT_POST_API_TIMEOUT);
  }
}

function handlePopHistory() {
  if (getDefaultStore().get(shownAtom)) {
    hideSlideUpRaw();
    return true;
  }
  return false;
}

export const hideSlideUp = markStable(function hideSlideUp(instant?: boolean) {
  hideSlideUpRaw(instant);
  removePopHandler(handlePopHistory);
});

export const showSlideUp = markStable(function showSlideUp(element: ReactElement) {
  if (ref.hideTimer) {
    clearTimeout(ref.hideTimer);
    ref.hideTimer = null;
  }

  const store = getDefaultStore();
  store.set(shownAtom, true);
  store.set(elemAtom, markStable(React.cloneElement(
    element,
    { key: ref.numShown },
  )));
  ref.numShown++;

  addPopHandler(handlePopHistory);
});
