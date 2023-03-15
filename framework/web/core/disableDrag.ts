const tagNames = new Set(['IMG', 'A']);

export default function disableDragImage() {
  document.addEventListener('dragstart', e => {
    const tagName = e.target instanceof HTMLElement ? e.target.tagName : null;
    if (tagName && tagNames.has(tagName)) {
      e.preventDefault();
    }
  });
}
