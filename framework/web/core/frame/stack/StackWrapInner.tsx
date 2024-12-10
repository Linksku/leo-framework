import type { Props as SwipeProps } from 'core/useSwipeNavigation';
import StackWrapInnerTopBar from 'core/frame/stack/StackWrapInnerTopBar';
import Swipeable from 'core/frame/Swipeable';
import LoadingRoute from 'routes/LoadingRoute';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import { CONTAINER_MAX_WIDTH } from 'consts/ui';
import useWindowSize from 'core/globalState/useWindowSize';
import useEnterRoute from 'core/router/useEnterRoute';
import { addPopHandler } from 'stores/history/HistoryStore';
import stackToAnimatedVal from 'core/globalState/stackToAnimatedVal';
import useGoLeftStack from 'stores/history/useGoLeftStack';
import useGoRightStack from 'stores/history/useGoRightStack';

import styles from './StackWrapInner.scss';

type Props = {
  disableBackSwipe?: boolean,
  confirmOnBack?: boolean,
  greyBackground?: boolean,
  // Can't put fixed elements inside .inner because of translateZ(0)
  fixedElements?: React.ReactNode,
  bottomColor?: string,
  bottomBar?: ReactElement,
  flexBody?: boolean,
  fullWidth?: boolean,
  className?: string,
  bodyClassName?: string,
} & Parameters<typeof StackWrapInnerTopBar>[0];

export default function StackWrapInner({
  children,
  disableBackSwipe,
  confirmOnBack,
  greyBackground,
  fixedElements,
  bottomColor,
  bottomBar,
  flexBody,
  fullWidth,
  className,
  bodyClassName,
  ...props
}: React.PropsWithChildren<Props>) {
  const {
    forwardState,
    isRouteActive,
    isRightStack,
    historyState,
    routeContainerRef,
  } = useRouteStore();
  const goLeftStack = useGoLeftStack();
  const goRightStack = useGoRightStack();
  const windowSize = useWindowSize();
  const showToast = useShowToast();

  const outerScrollTop = useRef(0);
  const innerScroll = useRef({ top: 0, idx: 0 });
  useEnterRoute(useCallback(() => {
    const removePopHandler = confirmOnBack
      ? addPopHandler(() => {
        showToast({
          msg: 'Back again to exit',
        });
        return true;
      })
      : null;

    if (flexBody && innerScroll.current.top && routeContainerRef.current) {
      routeContainerRef.current.children[innerScroll.current.idx].scrollTop
        = innerScroll.current.top;
    }
    if (!flexBody && outerScrollTop.current && routeContainerRef.current) {
      routeContainerRef.current.scrollTop = outerScrollTop.current;
    }

    return () => {
      removePopHandler?.();

      outerScrollTop.current = 0;
      innerScroll.current = { top: 0, idx: 0 };
      if (flexBody) {
        const containerChildren = routeContainerRef.current?.children;
        if (containerChildren) {
          for (let i = 0; i < containerChildren.length; i++) {
            const child = containerChildren[i];
            if (child.scrollTop !== 0) {
              innerScroll.current = { top: child.scrollTop, idx: i };
              break;
            }
          }
        }
      } else {
        outerScrollTop.current = routeContainerRef.current?.scrollTop ?? 0;
      }
    };
  }, [confirmOnBack, showToast, flexBody, routeContainerRef]));

  const enableSwipeFromLeft = isRouteActive && !disableBackSwipe;
  const enableSwipeFromRight = (isRouteActive || isRightStack) && !!forwardState;
  const leftMaxSwipeStartDist = undefined;
  let rightMaxSwipeStartDist = 35;
  if (windowSize.width > CONTAINER_MAX_WIDTH) {
    rightMaxSwipeStartDist += (windowSize.width - CONTAINER_MAX_WIDTH) / 2;
  }
  const swipeProps = useMemo(() => ({
    disabled: !enableSwipeFromLeft && !enableSwipeFromRight,
    direction: enableSwipeFromLeft && enableSwipeFromRight
      ? 'horizontal'
      : (enableSwipeFromLeft ? 'right' : 'left'),
    maxSwipeStartDist: [leftMaxSwipeStartDist, rightMaxSwipeStartDist],
    setPercent(p, duration, { direction, easing }) {
      if (direction === 'right') {
        stackToAnimatedVal.get(historyState)
          ?.setVal(
            p,
            duration,
            easing,
          );
      } else if (forwardState) {
        stackToAnimatedVal.get(forwardState)
          ?.setVal(
            100 - p,
            duration,
            easing,
          );
      }
    },
    onNavigate(dir) {
      if (dir === 'right') {
        goLeftStack();
      } else {
        goRightStack();
      }
    },
  } satisfies SwipeProps<HTMLDivElement>), [
    enableSwipeFromLeft,
    enableSwipeFromRight,
    historyState,
    forwardState,
    goLeftStack,
    goRightStack,
    leftMaxSwipeStartDist,
    rightMaxSwipeStartDist,
  ]);
  // todo: mid/mid swipeable element should be full width
  return (
    <div
      className={cx(styles.container, className, {
        [styles.greyBackground]: greyBackground,
      })}
    >
      <div className={styles.topBarWrap}>
        <StackWrapInnerTopBar
          {...props}
          noBorder={greyBackground}
        />
      </div>

      <Swipeable
        ref={ref => {
          routeContainerRef.current = markStable(ref);
        }}
        swipeProps={swipeProps}
        className={cx(styles.body, {
          [styles.flexBody]: flexBody,
          [styles.fullWidth]: fullWidth,
          [styles.inactiveRoute]: !isRouteActive,
        }, bodyClassName)}
      >
        <ErrorBoundary
          Loading={<LoadingRoute />}
        >
          {flexBody
            ? children
            : (
              <div className={styles.withScrollbarInner}>
                {children}
              </div>
            )}
          <div
            className={styles.bottomSpacer}
            style={{
              backgroundColor: bottomColor,
            }}
          />
        </ErrorBoundary>
      </Swipeable>

      {fixedElements}

      {bottomBar && (
        <div className={styles.bottomBarWrap}>
          <div className={styles.bottomBarInner}>
            {bottomBar}
          </div>
        </div>
      )}
    </div>
  );
}
