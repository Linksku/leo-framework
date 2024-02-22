const disableDragTags = new Set(['IMG', 'A']);

export default function disableGestures() {
  document.addEventListener('gesturestart', e => {
    e.preventDefault();
  });

  document.addEventListener('gesturechange', e => {
    e.preventDefault();
  });

  document.addEventListener('dragstart', e => {
    const tagName = e.target instanceof HTMLElement ? e.target.tagName : null;
    if (tagName && disableDragTags.has(tagName)) {
      e.preventDefault();
    }
  });
}
