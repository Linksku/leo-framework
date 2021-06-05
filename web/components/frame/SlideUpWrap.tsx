import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';

import { useAnimatedValue, useAnimation } from 'lib/hooks/useAnimation';
import mergeRefs from 'lib/mergeRefs';

import styles from './SlideUpWrapStyles.scss';

export type Props = EmptyObj;

export default function SlideUpWrap(_: Props) {
  const { hideSlideUp, slideUpShown, slideUpElement } = useSlideUpStore();
  const [shownPercent, setShownPercent] = useAnimatedValue({
    defaultValue: slideUpShown ? 100 : 0,
  });
  const [dialogRef, dialogStyle] = useAnimation<HTMLDivElement>();
  const [containerRef, containerStyle] = useAnimation<HTMLDivElement>();
  const { ref, bindSwipe } = useSwipeNavigation({
    onNavigate: hideSlideUp,
    setPercent: p => setShownPercent(100 - p),
    direction: 'down',
    enabled: slideUpShown,
  });

  useEffect(() => {
    setShownPercent(slideUpShown ? 100 : 0);
  }, [setShownPercent, slideUpShown]);

  return (
    <>
      <div
        ref={dialogRef}
        style={dialogStyle(shownPercent, {
          filter: x => `opacity(${x}%)`,
          display: x => (x < 1 ? 'none' : 'block'),
          pointerEvents: x => (x < 50 ? 'none' : 'auto'),
        })}
        className={styles.overlay}
        onClick={hideSlideUp}
        role="dialog"
        {...bindSwipe()}
      />
      <div
        ref={mergeRefs(ref, containerRef)}
        style={containerStyle(shownPercent, {
          transform: x => `translateY(${100 - x}%)`,
        })}
        className={styles.container}
        {...bindSwipe()}
      >
        <div className={styles.dragSymbol} />
        <div className={styles.containerInner}>
          <React.Suspense fallback={<Spinner />}>
            {slideUpElement}
          </React.Suspense>
        </div>
      </div>
    </>
  );
}
