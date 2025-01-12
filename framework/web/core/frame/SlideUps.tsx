import type { Props as SwipeProps } from 'core/useSwipeNavigation';
import Swipeable from 'core/frame/Swipeable';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import { useAnimatedValue, useAnimation } from 'core/useAnimation';
import usePrevious from 'utils/usePrevious';
import { elemAtom, hideSlideUp, shownAtom } from 'stores/SlideUpStore';

import styles from './SlideUps.scss';

export default function SlideUps() {
  const shown = useAtomValue(shownAtom);
  const element = useAtomValue(elemAtom);
  const animatedShownPercent = useAnimatedValue(
    0,
    { debugName: 'SlideUps' },
  );
  const [overlayRef, overlayStyle] = useAnimation<HTMLDivElement>(
    animatedShownPercent,
    'SlideUps:overlay',
  );
  const [containerRef, containerStyle] = useAnimation<HTMLDivElement>(
    animatedShownPercent,
    'SlideUps',
  );

  const prevShown = usePrevious(shown);
  useEffect(() => {
    if (prevShown && !shown) {
      animatedShownPercent.setVal(0, !element ? 0 : undefined);
    }
  }, [animatedShownPercent, prevShown, shown, element]);

  const overlaySwipeProps = useMemo(() => ({
    elementRef: containerRef,
    onNavigate: () => hideSlideUp(),
    setPercent(p, duration, { easing }) {
      animatedShownPercent.setVal(
        100 - p,
        duration,
        easing,
      );
    },
    direction: 'down',
    disabled: !shown,
  } satisfies SwipeProps<HTMLDivElement>), [
    animatedShownPercent,
    containerRef,
    shown,
  ]);
  const containerSwipeProps = useMemo(() => ({
    onNavigate: () => hideSlideUp(),
    setPercent(p, duration, { easing }) {
      animatedShownPercent.setVal(
        100 - p,
        duration,
        easing,
      );
    },
    direction: 'down',
    disabled: !shown,
  } satisfies SwipeProps<HTMLDivElement>), [
    animatedShownPercent,
    shown,
  ]);

  useEffect(() => {
    if (element) {
      animatedShownPercent.setVal(100);
    }
  }, [element, animatedShownPercent]);

  if (!element) {
    return null;
  }
  return (
    <>
      <Swipeable
        ref={overlayRef}
        swipeProps={overlaySwipeProps}
        style={overlayStyle(
          {
            opacity: x => x / 100,
          },
          {
            stylesForFinalVal: {
              0: { display: 'none' },
            },
          },
        )}
        className={styles.overlay}
        onClick={() => hideSlideUp()}
        role="dialog"
      />
      <Swipeable
        ref={containerRef}
        swipeProps={containerSwipeProps}
        style={containerStyle(
          {
            transform: x => `translateY(${100 - x}%)`,
          },
          {
            stylesForFinalVal: {
              0: { display: 'none' },
            },
          },
        )}
        className={styles.container}
      >
        <div className={styles.dragSymbol} />
        <div className={styles.containerInner}>
          <ErrorBoundary
            Loading={(
              <Spinner
                verticalMargin={20}
                dimRem={4}
              />
            )}
          >
            {element}
          </ErrorBoundary>
        </div>
      </Swipeable>
    </>
  );
}
