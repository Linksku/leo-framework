import type { AnimationStyle } from 'lib/hooks/useAnimation';

import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import { HomeSidebarInner } from 'config/homeComponents';
import ErrorBoundary from 'components/ErrorBoundary';

import styles from './HomeSidebarStyles.scss';

type Props = {
  sidebarRef: React.MutableRefObject<HTMLDivElement | null>,
  sidebarStyle: Memoed<AnimationStyle>,
  dialogRef: React.MutableRefObject<HTMLDivElement | null>,
  dialogStyle: Memoed<AnimationStyle>,
};

function HomeSidebar({
  sidebarRef,
  sidebarStyle,
  dialogRef,
  dialogStyle,
}: Props) {
  const { sidebarShownPercent, sidebarLoaded, hideSidebar } = useUIFrameStore();

  const { bindSwipe } = useSwipeNavigation<HTMLDivElement>({
    onNavigate: () => hideSidebar(),
    setPercent: (p: number) => sidebarShownPercent.setVal(100 - p),
    direction: 'left',
    elementRef: sidebarRef,
  });

  return (
    <>
      <div
        ref={dialogRef}
        style={dialogStyle(sidebarShownPercent, {
          filter: x => `opacity(${x}%)`,
          display: x => (x < 1 ? 'none' : 'block'),
          pointerEvents: x => (x < 50 ? 'none' : 'auto'),
        }, [1, 50])}
        className={styles.overlay}
        onClick={() => hideSidebar()}
        role="dialog"
        {...bindSwipe()}
      />
      <div
        ref={sidebarRef}
        style={sidebarStyle(sidebarShownPercent, {
          transform: x => `translateX(${x - 100}%)`,
        })}
        className={styles.sidebar}
        {...bindSwipe()}
      >
        <ErrorBoundary
          renderFallback={() => (
            <p>Failed to load.</p>
          )}
        >
          <React.Suspense fallback={<Spinner />}>
            {sidebarLoaded
              ? <HomeSidebarInner />
              : null}
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}

export default React.memo(HomeSidebar);
