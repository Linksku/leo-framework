import type { Props as SwipeProps } from 'core/useSwipeNavigation';
import Swipeable from 'core/frame/Swipeable';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import LoadingRoute from 'routes/LoadingRoute';
import { CONTAINER_MAX_WIDTH } from 'consts/ui';
import useWindowSize from 'core/globalState/useWindowSize';
import activeHomeTabElemRef from 'core/globalState/activeHomeTabElemRef';
import { preventsSwipeDirectionChange } from 'core/browserHacks/browserHackGatings';
import mergeRefs from 'utils/mergeRefs';
import stackToAnimatedVal from 'core/globalState/stackToAnimatedVal';

import historyQueue from 'core/globalState/historyQueue';
import styles from './HomeWrapInner.scss';

export default function HomeWrapInner({
  children,
  greyBackground,
  fixedElement,
}: React.PropsWithChildren<{
  greyBackground?: boolean,
  // Can't put fixed elements inside .inner because of translateZ(0)
  fixedElement?: React.ReactNode,
}>) {
  const {
    direction: lastNavDirection,
    prevState,
    isPrevHome,
  } = useNavState();
  const { loadSidebar, sidebarShownPercent, sidebarRef } = useUIFrameStore();
  const windowSize = useWindowSize();
  const { isRouteActive, routeContainerRef, path } = useRouteStore();

  // todo: mid/mid maybe add another element just for swiping
  // todo: mid/mid pull HomeWrapInner to refresh
  let maxSwipeStartDist = 35;
  if (windowSize.width > CONTAINER_MAX_WIDTH) {
    maxSwipeStartDist += (windowSize.width - CONTAINER_MAX_WIDTH) / 2;
  }
  const swipeProps = useMemo(() => ({
    direction: prevState && !isPrevHome ? 'horizontal' : 'right',
    elementRef: sidebarRef,
    maxSwipeStartDist,
    onStart(direction) {
      if (direction === 'right') {
        // todo: low/mid this causes UIFrameStore to rerender twice, related to suspense
        loadSidebar();
      }
    },
    setPercent(p, duration, { direction, easing }) {
      if (direction === 'right') {
        sidebarShownPercent.setVal(
          p,
          duration,
          easing,
        );
      } else if (prevState) {
        stackToAnimatedVal.get(prevState)
          ?.setVal(
            100 - p,
            duration,
            easing,
          );
      }
    },
    onNavigate(direction) {
      if (direction === 'left' && prevState && !isPrevHome && isRouteActive) {
        if (lastNavDirection === 'back') {
          historyQueue.forward();
        } else if (lastNavDirection === 'forward') {
          historyQueue.back();
        }
      }
    },
    dragOpts: preventsSwipeDirectionChange()
      ? {
        pointer: {
          // Fixes L-shaped swipes not working
          //   https://github.com/pmndrs/use-gesture/discussions/640#discussioncomment-7611402
          touch: true,
        },
      }
      : undefined,
  } satisfies SwipeProps<HTMLDivElement>), [
    isPrevHome,
    isRouteActive,
    lastNavDirection,
    loadSidebar,
    prevState,
    sidebarRef,
    maxSwipeStartDist,
    sidebarShownPercent,
  ]);
  return (
    <div
      data-route={path}
      className={cx(styles.container, {
        [styles.greyBackground]: greyBackground,
      })}
    >
      <Swipeable
        ref={mergeRefs(
          ref => {
            routeContainerRef.current = markStable(ref);
          },
          activeHomeTabElemRef,
        )}
        swipeProps={swipeProps}
        className={cx(styles.swipeable, {
          [styles.inactiveRoute]: !isRouteActive,
        })}
      >
        <div
          className={styles.inner}
          data-testid={TestIds.homeWrapInner}
        >
          <ErrorBoundary
            Loading={<LoadingRoute />}
          >
            {children}
          </ErrorBoundary>
        </div>
      </Swipeable>
      {fixedElement}
    </div>
  );
}
