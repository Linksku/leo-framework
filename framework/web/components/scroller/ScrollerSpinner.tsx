import { DEFAULT_API_TIMEOUT } from 'consts/server';
import useVisibilityObserver from 'utils/useVisibilityObserver';

import styles from './ScrollerSpinner.scss';

export default function ScrollerSpinner({
  numItems,
  spinnerPadding = '10rem',
  spinnerDimRem,
  spinnerWrapClassName,
  onSpinnerVisible,
  onSpinnerTimeout,
}: {
  numItems: number,
  spinnerPadding?: string,
  spinnerDimRem?: number,
  spinnerWrapClassName?: string,
  onSpinnerVisible?: Stable<() => void>,
  onSpinnerTimeout?: Stable<() => void>,
}) {
  const [isSpinnerVisible, setIsSpinnerVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const visibilityRef = useVisibilityObserver({
    onVisible: useCallback(() => {
      onSpinnerVisible?.();
      setIsSpinnerVisible(true);

      if (onSpinnerTimeout) {
        timerRef.current = window.setTimeout(
          onSpinnerTimeout,
          Math.min(5000, DEFAULT_API_TIMEOUT / 2),
        );
      }
    }, [onSpinnerVisible, onSpinnerTimeout]),
    onHidden: useCallback(() => {
      setIsSpinnerVisible(false);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }, []),
  });

  useEffect(() => {
    if (onSpinnerTimeout && isSpinnerVisible) {
      // In case onVisible runs before useEffect with double useEffect
      timerRef.current = window.setTimeout(
        onSpinnerTimeout,
        Math.min(5000, DEFAULT_API_TIMEOUT / 2),
      );
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [onSpinnerTimeout, isSpinnerVisible, numItems]);

  return (
    <div
      key={numItems}
      ref={visibilityRef}
      className={cx(styles.spinnerWrap, spinnerWrapClassName)}
      style={{
        padding: spinnerPadding.includes(' ') ? spinnerPadding : `${spinnerPadding} 0`,
      }}
    >
      {isSpinnerVisible && (
        <Spinner
          dimRem={spinnerDimRem}
        />
      )}
    </div>
  );
}
