import useDocumentEvent from 'utils/useDocumentEvent';

export default function VisibilityChangeHandler() {
  useDocumentEvent('visibilitychange', useCallback(() => {
    const { activeElement, hidden, body } = document;
    if (hidden
      || !activeElement
      || !(activeElement instanceof HTMLElement)
      || activeElement === body) {
      return;
    }

    // Fixes elements stuck in `:active` state on Android
    const { parentElement, nextSibling } = activeElement;
    if (parentElement) {
      activeElement.remove();
      if (nextSibling) {
        nextSibling.before(activeElement);
      } else {
        parentElement.append(activeElement);
      }
    }
  }, []));

  return null;
}
