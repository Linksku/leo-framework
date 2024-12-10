import { LONG_PRESS_DELAY, MAX_TAP_MOVE_DIST } from 'consts/ui';
import isTouchDevice from 'utils/isTouchDevice';

export default function useLongPress<T extends HTMLElement>(
  onLongPress: (e: PointerEvent) => void,
): React.RefCallback<T> {
  const ref = useRef({
    elem: null as T | null,
    startX: null as number | null,
    startY: null as number | null,
    timer: null as number | null,
    cancelNextClick: false,
  });
  const latestOnLongPress = useLatestCallback(onLongPress);
  const [cbs] = useState(() => {
    const handleCancel = () => {
      if (ref.current.timer) {
        clearTimeout(ref.current.timer);
        ref.current.timer = null;
      }
    };
    return {
      pointerdown(e: PointerEvent) {
        if (ref.current.timer) {
          clearTimeout(ref.current.timer);
        }

        ref.current.startX = e.pageX;
        ref.current.startY = e.pageY;
        ref.current.timer = window.setTimeout(() => {
          latestOnLongPress(e);
          ref.current.cancelNextClick = true;
          ref.current.timer = null;
        }, LONG_PRESS_DELAY);
        ref.current.cancelNextClick = false;
      },
      pointermove(e: PointerEvent) {
        if (ref.current.timer
          && ref.current.startX != null
          && ref.current.startY != null
          && (e.pageX !== ref.current.startX || e.pageY !== ref.current.startY)
          && Math.max(
            Math.abs(e.pageX - ref.current.startX),
            Math.abs(e.pageY - ref.current.startY),
          ) >= MAX_TAP_MOVE_DIST) {
          clearTimeout(ref.current.timer);
          ref.current.timer = null;
        }
      },
      pointerup: handleCancel,
      pointerout: handleCancel,
      click(e: MouseEvent) {
        if (ref.current.cancelNextClick) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      contextmenu(e: MouseEvent) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
      },
    };
  });

  return (elem: T | null) => {
    if (elem) {
      for (const key of TS.objKeys(cbs)) {
        if (key === 'contextmenu') {
          if (isTouchDevice()) {
            elem.addEventListener(key, cbs[key] as any);
          }
        } else {
          elem.addEventListener(key, cbs[key] as any);
        }
      }
    } else if (ref.current.elem) {
      const oldElem = ref.current.elem;
      for (const key of TS.objKeys(cbs)) {
        oldElem.removeEventListener(key, cbs[key] as any);
      }
    }

    ref.current.elem = elem;
  };
}
