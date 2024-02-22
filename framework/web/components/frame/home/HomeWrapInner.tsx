import Swipeable from 'components/frame/Swipeable';
import ErrorBoundary from 'components/ErrorBoundary';
import LoadingRoute from 'routes/LoadingRoute';
import { useInnerContainerRef, useIsRouteActive } from 'stores/RouteStore';
import { CONTAINER_MAX_WIDTH, IOS_EDGE_SWIPE_PX } from 'consts/ui';

import styles from './HomeWrapInner.scss';

export default function HomeWrapInner({
  children,
  greyBackground,
  fixedElements,
}: React.PropsWithChildren<{
  greyBackground?: boolean,
  // Can't put fixed elements inside .inner because of translateZ(0)
  fixedElements?: React.ReactNode,
}>) {
  const innerContainerRef = useInnerContainerRef();
  const { direction: lastNavDirection, prevState } = useHistoryStore();
  const { loadSidebar, sidebarShownPercent, sidebarRef } = useUIFrameStore();
  const { stackToAnimatedVal } = useStacksNavStore();
  const { isPrevHome } = useHomeNavStore();
  const windowSize = useWindowSize();
  const isRouteActive = useIsRouteActive();

  let maxSwipeStartDist = Math.max(IOS_EDGE_SWIPE_PX, windowSize.width / 6);
  if (windowSize.width > CONTAINER_MAX_WIDTH) {
    maxSwipeStartDist += (windowSize.width - CONTAINER_MAX_WIDTH) / 2;
  }
  return (
    <div
      className={cx(styles.container, {
        [styles.greyBackground]: greyBackground,
      })}
    >
      <Swipeable
        ref={innerContainerRef}
        swipeProps={{
          direction: prevState && !isPrevHome ? 'horizontal' : 'right',
          elementDim: windowSize.width,
          maxSwipeStartDist,
          onStart(direction) {
            if (direction === 'right') {
              // todo: low/mid this causes UIFrameStore to rerender twice, related to suspense
              loadSidebar();
            }
          },
          setPercent(p, duration, direction) {
            if (direction === 'right') {
              sidebarShownPercent.setVal(
                p,
                duration,
                'easeOutQuad',
              );
            } else if (prevState) {
              stackToAnimatedVal.current.get(prevState)
                ?.setVal(
                  100 - p,
                  duration,
                  'easeOutQuad',
                );
            }
          },
          onNavigate(direction) {
            if (direction === 'left' && prevState && !isPrevHome && isRouteActive) {
              if (lastNavDirection === 'back') {
                window.history.forward();
              } else if (lastNavDirection === 'forward') {
                window.history.back();
              }
            }
          },
          getElement(direction) {
            return direction === 'left' ? null : sidebarRef.current;
          },
          dragOpts: {
            pointer: {
              // Fixes L-shaped swipes not working
              //   https://github.com/pmndrs/use-gesture/discussions/640#discussioncomment-7611402
              touch: true,
            },
          },
        }}
        className={styles.swipeable}
      >
        <div
          className={styles.inner}
          data-testid={TestIds.homeWrapInner}
        >
          <ErrorBoundary
            renderLoading={() => <LoadingRoute />}
          >
            {children}
          </ErrorBoundary>
        </div>
      </Swipeable>
      {fixedElements}
    </div>
  );
}
