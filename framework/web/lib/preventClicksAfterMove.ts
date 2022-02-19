const MIN_MOVE_DIST = 5;

export default function preventClicksAfterMove() {
  let startX = 0;
  let startY = 0;

  window.addEventListener('mousedown', e => {
    startX = e.clientX;
    startY = e.clientY;
  });

  window.addEventListener('click', e => {
    if (e.clientX === 0 && e.clientY === 0
      && e.screenX === 0 && e.screenY === 0
      && (e.target as any).type === 'submit') {
      return;
    }

    if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > MIN_MOVE_DIST) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, { capture: true });
}
