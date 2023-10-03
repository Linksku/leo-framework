import Swipeable from 'components/frame/Swipeable';
import { useAnimation } from 'hooks/useAnimation';
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
  const [overlayRef, overlayStyle] = useAnimation<HTMLDivElement>(
    sidebarShownPercent,
    'Sidebar:overlay',
  );

  return (
    <>
      <Swipeable
        ref={overlayRef}
        swipeProps={{
          onNavigate: () => hideSidebar(),
          setPercent(p, duration) {
            sidebarShownPercent.setVal(
              100 - p,
              duration,
            );
          },
          direction: 'left',
          elementRef: sidebarRef,
        }}
        style={overlayStyle(
          {
            filter: x => `opacity(${x}%)`,
            pointerEvents: (_, x) => (x < 50 ? 'none' : 'auto'),
          },
          {
            stylesForFinalVal: {
              0: { display: 'none' },
            },
            keyframes: [50],
            defaultEasing: 'linear',
          },
        )}
        className={styles.overlay}
        onClick={() => hideSidebar()}
        role="dialog"
      />
      <Swipeable
        ref={sidebarRef}
        swipeProps={{
          onNavigate: () => hideSidebar(),
          setPercent(p, duration) {
            sidebarShownPercent.setVal(
              100 - p,
              duration,
              'easeOutQuad',
            );
          },
          direction: 'left',
          elementRef: sidebarRef,
        }}
        style={sidebarStyle({
          transform: x => `translateX(${x - 100}%)`,
        })}
        className={styles.sidebar}
      >
        <ErrorBoundary>
          {sidebarLoaded && <HomeSidebarInner />}
        </ErrorBoundary>
      </Swipeable>
    </>
  );
});
