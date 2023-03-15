import Swipeable from 'components/frame/Swipeable';
import ErrorBoundary from 'components/ErrorBoundary';
import LoadingRoute from 'routes/LoadingRoute';
import { DEFAULT_DURATION } from 'utils/hooks/useAnimation';
import { useInnerContainerRef } from 'stores/RouteStore';

import styles from './HomeWrapInnerStyles.scss';

export default function HomeWrapInner({
  children,
  backgroundColor,
  fixedElements,
}: React.PropsWithChildren<{
  backgroundColor?: string,
  // Can't put fixed elements inside .inner because of translateZ(0)
  fixedElements?: React.ReactNode,
}>) {
  const innerContainerRef = useInnerContainerRef();
  const { direction: lastNavDirection } = useHistoryStore();
  const { loadSidebar, sidebarShownPercent, sidebarRef } = useUIFrameStore();
  const { lastStackAnimatedVal } = useStacksNavStore();
  const { wasHome } = useHomeNavStore();
  return (
    <div
      className={styles.container}
      style={{
        backgroundColor,
      }}
    >
      <Swipeable
        ref={innerContainerRef}
        swipeProps={{
          onStart(direction) {
            if (direction === 'right') {
              // todo: low/mid this causes UIFrameStore to rerender twice, related to suspense
              loadSidebar();
            }
          },
          setPercent(p, durationPercent, direction) {
            if (direction === 'right') {
              sidebarShownPercent.setVal(
                p,
                durationPercent * DEFAULT_DURATION,
              );
            } else {
              lastStackAnimatedVal.current?.setVal(
                100 - p,
                durationPercent * DEFAULT_DURATION,
              );
            }
          },
          onNavigate(direction) {
            if (direction === 'left' && !wasHome) {
              if (lastNavDirection === 'back') {
                window.history.forward();
              } else {
                window.history.back();
              }
            }
          },
          getElement(direction) {
            return direction === 'left' ? null : sidebarRef.current;
          },
          direction: wasHome ? 'right' : 'horizontal',
          maxSwipeStartDist: 50,
        }}
        className={styles.swipeable}
      >
        <div className={styles.inner}>
          <ErrorBoundary>
            <React.Suspense fallback={<LoadingRoute />}>
              {children}
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </Swipeable>
      {fixedElements}
    </div>
  );
}
