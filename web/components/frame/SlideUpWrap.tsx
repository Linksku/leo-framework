import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import ErrorBoundary from 'components/ErrorBoundary';
import { useAnimatedValue, useAnimation } from 'lib/hooks/useAnimation';
import mergeRefs from 'lib/mergeRefs';

import styles from './SlideUpWrapStyles.scss';

export default function SlideUpWrap() {
  const { hideSlideUp, slideUpShown, slideUpElement } = useSlideUpStore();
  const animatedShownPercent = useAnimatedValue(slideUpShown ? 100 : 0, 'SlideUpWrap');
  const [dialogRef, dialogStyle] = useAnimation<HTMLDivElement>();
  const [containerRef, containerStyle] = useAnimation<HTMLDivElement>();
  const { ref, bindSwipe } = useSwipeNavigation({
    onNavigate: hideSlideUp,
    setPercent: p => animatedShownPercent.setVal(100 - p),
    direction: 'down',
    enabled: slideUpShown,
  });

  useEffect(() => {
    animatedShownPercent.setVal(slideUpShown ? 100 : 0);
  }, [animatedShownPercent, slideUpShown]);

  return (
    <>
      <div
        ref={dialogRef}
        style={dialogStyle(animatedShownPercent, {
          filter: x => `opacity(${x}%)`,
          display: x => (x < 1 ? 'none' : 'block'),
          pointerEvents: x => (x < 50 ? 'none' : 'auto'),
        }, [1, 50])}
        className={styles.overlay}
        onClick={() => hideSlideUp()}
        role="dialog"
        {...bindSwipe()}
      />
      <div
        ref={mergeRefs(ref, containerRef)}
        style={containerStyle(animatedShownPercent, {
          transform: x => `translateY(${100 - x}%)`,
          display: x => (x < 1 ? 'none' : 'block'),
        }, [1])}
        className={styles.container}
        {...bindSwipe()}
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
      </div>
    </>
  );
}
