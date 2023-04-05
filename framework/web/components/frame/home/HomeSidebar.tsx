import Swipeable from 'components/frame/Swipeable';
import { useAnimation, DEFAULT_DURATION } from 'hooks/useAnimation';
import { HomeSidebarInner } from 'config/homeComponents';
import ErrorBoundary from 'components/ErrorBoundary';

import styles from './HomeSidebarStyles.scss';

export default React.memo(function HomeSidebar() {
  const {
    sidebarLoaded,
    sidebarShownPercent,
    sidebarRef,
    sidebarStyle,
    hideSidebar,
  } = useUIFrameStore();
  const [dialogRef, dialogStyle] = useAnimation<HTMLDivElement>();

  return (
    <>
      <Swipeable
        ref={dialogRef}
        swipeProps={{
          onNavigate: hideSidebar,
          setPercent: (p, durationPercent) => sidebarShownPercent.setVal(
            100 - p,
            durationPercent * DEFAULT_DURATION,
          ),
          direction: 'left',
          elementRef: sidebarRef,
        }}
        style={dialogStyle(
          sidebarShownPercent,
          {
            filter: x => `opacity(${x}%)`,
            display: x => (x < 1 ? 'none' : 'block'),
            pointerEvents: x => (x < 50 ? 'none' : 'auto'),
          },
          { keyframes: [1, 50] },
        )}
        className={styles.overlay}
        onClick={() => hideSidebar()}
        role="dialog"
      />
      <Swipeable
        ref={sidebarRef}
        swipeProps={{
          onNavigate: hideSidebar,
          setPercent: (p, durationPercent) => sidebarShownPercent.setVal(
            100 - p,
            durationPercent * DEFAULT_DURATION,
          ),
          direction: 'left',
          elementRef: sidebarRef,
        }}
        style={sidebarStyle(sidebarShownPercent, {
          transform: x => `translateX(${x - 100}%)`,
        })}
        className={styles.sidebar}
      >
        <ErrorBoundary
          renderFallback={() => (
            <p>Failed to load.</p>
          )}
        >
          <React.Suspense fallback={<Spinner />}>
            {sidebarLoaded && <HomeSidebarInner />}
          </React.Suspense>
        </ErrorBoundary>
      </Swipeable>
    </>
  );
});
