import { usePinch } from '@use-gesture/react';

import styles from './Pinchable.scss';

type DragMemo = [number, number];

// todo: low/med maybe move Pinchable to top level
export default function Pinchable({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  const [isPinching, setIsPinching] = useState(false);
  const elemRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bind = usePinch(({
    canceled,
    origin,
    offset: [scale],
    memo: _memo,
    first,
    last,
  }): DragMemo => {
    let memo: DragMemo | undefined = _memo;
    const elem = elemRef.current;
    const overlay = overlayRef.current;
    if (canceled || last || !elem) {
      if (elem) {
        elem.style.transformOrigin = '';
        elem.style.transform = '';
      }
      setIsPinching(false);
      return origin;
    }
    if (first) {
      elem.style.transition = '';
      const rect = elem.getBoundingClientRect();
      elem.style.transformOrigin = `${origin[0] - rect.left}px ${origin[1] - rect.top}px`;
      setIsPinching(true);
    }
    if (!memo) {
      memo = origin;
    }

    elem.style.transform = [
      `translateX(${origin[0] - memo[0]}px)`,
      `translateY(${origin[1] - memo[1]}px)`,
      `scale(${scale})`,
    ].join(' ');
    if (overlay) {
      overlay.style.filter = `opacity(${0.7 * (scale - 1) / 2.5})`;
    }
    return memo;
  }, {
    from: [1, 0],
    scaleBounds: { min: 1, max: 2.5 },
    rubberband: true,
    preventDefault: true,
  });

  return (
    <div
      {...bind()}
      className={cx(className, styles.container, {
        [styles.isPinching]: isPinching,
      })}
    >
      {isPinching && (
        <div
          ref={overlayRef}
          className={styles.pinchableOverlay}
          onClick={() => setIsPinching(false)}
          role="dialog"
        />
      )}
      <div
        ref={elemRef}
        className={styles.pinchableElem}
      >
        {children}
      </div>
    </div>
  );
}
