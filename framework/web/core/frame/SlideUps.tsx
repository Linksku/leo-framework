import type { Props as SwipeProps } from 'core/useSwipeNavigation';
import Swipeable from 'core/frame/Swipeable';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import { useAnimation } from 'core/useAnimation';

import styles from './SlideUps.scss';

export default function SlideUps() {
  const {
    hideSlideUp,
    slideUpShown,
    slideUpElement,
    animatedShownPercent,
  } = useSlideUpStore();
  const [overlayRef, overlayStyle] = useAnimation<HTMLDivElement>(
    animatedShownPercent,
    'SlideUps:overlay',
  );
  const [containerRef, containerStyle] = useAnimation<HTMLDivElement>(
    animatedShownPercent,
    'SlideUps',
  );

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
    disabled: !slideUpShown,
  } satisfies SwipeProps<HTMLDivElement>), [
    animatedShownPercent,
    containerRef,
    hideSlideUp,
    slideUpShown,
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
    disabled: !slideUpShown,
  } satisfies SwipeProps<HTMLDivElement>), [
    animatedShownPercent,
    hideSlideUp,
    slideUpShown,
  ]);

  useEffect(() => {
    if (slideUpElement) {
      animatedShownPercent.setVal(100);
    }
  }, [slideUpElement, animatedShownPercent]);

  if (!slideUpElement) {
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
            {slideUpElement}
          </ErrorBoundary>
        </div>
      </Swipeable>
    </>
  );
}
