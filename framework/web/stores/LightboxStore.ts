import { getDefaultStore } from 'jotai';

import { addPopHandler, removePopHandler } from 'stores/history/HistoryStore';

export const mediaUrlAtom = atom<string | null>(null);

function handlePopHistory() {
  const store = getDefaultStore();
  if (store.get(mediaUrlAtom)) {
    store.set(mediaUrlAtom, null);
    return true;
  }
  return false;
}

export const showLightbox = markStable(function showLightbox(url: string) {
  getDefaultStore().set(mediaUrlAtom, url);

  addPopHandler(handlePopHistory);
});

export const hideLightbox = markStable(function hideLightbox() {
  getDefaultStore().set(mediaUrlAtom, null);

  removePopHandler(handlePopHistory);
});
