import Swipeable from 'components/frame/Swipeable';
import ErrorBoundary from 'components/ErrorBoundary';
import { useAnimatedValue, useAnimation, DEFAULT_DURATION } from 'utils/hooks/useAnimation';

import styles from './SlideUpsStyles.scss';

export default React.memo(function SlideUps() {
  const { hideSlideUp, slideUpShown, slideUpElement } = useSlideUpStore();
  const animatedShownPercent = useAnimatedValue(slideUpShown ? 100 : 0, 'SlideUps');
  const [dialogRef, dialogStyle] = useAnimation<HTMLDivElement>();
  const [containerRef, containerStyle] = useAnimation<HTMLDivElement>();

  useEffect(() => {
    animatedShownPercent.setVal(slideUpShown ? 100 : 0);
  }, [animatedShownPercent, slideUpShown]);

  return (
    <>
      <Swipeable
        ref={dialogRef}
        swipeProps={{
          elementRef: containerRef,
          onNavigate: () => hideSlideUp(),
          setPercent: (p, durationPercent) => animatedShownPercent.setVal(
            100 - p,
            durationPercent * DEFAULT_DURATION,
          ),
          direction: 'down',
          enabled: slideUpShown,
        }}
        style={dialogStyle(
          animatedShownPercent,
          {
            filter: x => `opacity(${x}%)`,
            display: x => (x < 1 ? 'none' : 'block'),
            pointerEvents: x => (x < 50 ? 'none' : 'auto'),
          },
          { keyframes: [1, 50] },
        )}
        className={styles.overlay}
        onClick={() => hideSlideUp()}
        role="dialog"
      />
      <Swipeable
        ref={containerRef}
        swipeProps={{
          onNavigate: () => hideSlideUp(),
          setPercent: (p, durationPercent) => animatedShownPercent.setVal(
            100 - p,
            durationPercent * 50,
          ),
          direction: 'down',
          enabled: slideUpShown,
        }}
        style={containerStyle(
          animatedShownPercent,
          {
            transform: x => `translateY(${100 - x}%)`,
            display: x => (x < 1 ? 'none' : 'flex'),
          },
          { keyframes: [1] },
        )}
        className={styles.container}
      >
        <div className={styles.dragSymbol} />
        <div className={styles.containerInner}>
          <ErrorBoundary
            renderFallback={() => (
              <p>Failed to load.</p>
            )}
          >
            <React.Suspense fallback={<Spinner />}>
              {slideUpElement}
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </Swipeable>
    </>
  );
});
