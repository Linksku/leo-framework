import Swipeable from 'components/frame/Swipeable';
import ErrorBoundary from 'components/ErrorBoundary';
import { useAnimation } from 'hooks/useAnimation';

import styles from './SlideUps.scss';

export default function SlideUps() {
  const {
    hideSlideUp,
    slideUpShown,
    slideUpElement,
    animatedShownPercent,
  } = useSlideUpStore();
  const [dialogRef, dialogStyle] = useAnimation<HTMLDivElement>(
    animatedShownPercent,
    'SlideUps:overlay',
  );
  const [containerRef, containerStyle] = useAnimation<HTMLDivElement>(
    animatedShownPercent,
    'SlideUps',
  );

  if (!slideUpElement) {
    return null;
  }
  return (
    <>
      <Swipeable
        ref={dialogRef}
        swipeProps={{
          elementRef: containerRef,
          onNavigate: () => hideSlideUp(),
          setPercent(p, duration) {
            animatedShownPercent.setVal(
              100 - p,
              duration,
              'easeOutQuad',
            );
          },
          direction: 'down',
          disabled: !slideUpShown,
        }}
        style={dialogStyle(
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
        swipeProps={{
          onNavigate: () => hideSlideUp(),
          setPercent(p, duration) {
            animatedShownPercent.setVal(
              100 - p,
              duration,
              'easeOutQuad',
            );
          },
          direction: 'down',
          disabled: !slideUpShown,
        }}
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
            renderLoading={() => (
              <Spinner
                verticalMargin={30}
                dimRem={3}
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
