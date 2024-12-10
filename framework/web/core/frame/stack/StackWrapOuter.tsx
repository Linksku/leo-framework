import { AnimatedValue, useAnimatedValue, useAnimation } from 'core/useAnimation';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import ErrorPage from 'core/frame/ErrorPage';
import stackToAnimatedVal from 'core/globalState/stackToAnimatedVal';
import LoadingStackInnerRoute from 'routes/LoadingStackInnerRoute';
import { avoidTransitionTransforms } from 'core/browserHacks/browserHackGatings';

import styles from './StackWrapOuter.scss';

const Overlay = React.memo(function Overlay({ animatedLeftPercent, routePath }: {
  animatedLeftPercent: Stable<AnimatedValue>,
  routePath: string,
}) {
  const [overlayRef, overlayStyle] = useAnimation<HTMLDivElement>(
    animatedLeftPercent,
    `StackWrapOuter(${routePath}):overlay`,
  );

  return (
    <div
      ref={overlayRef}
      style={overlayStyle(
        {
          opacity: x => (100 - x) / 100,
        },
        {
          stylesForFinalVal: {
            0: { display: 'none' },
          },
        },
      )}
      className={styles.overlay}
      role="dialog"
    />
  );
});

function ErrorMsg({ msg }: { msg: Stable<ReactNode> }) {
  return (
    <LoadingStackInnerRoute
      title="Error"
      placeholder={useMemo(() => (
        <ErrorPage
          title="Error"
          content={msg}
        />
      ), [msg])}
    />
  );
}

// Box shadow causes lag in Chrome and drop shadow causes lag in Safari
// boxShadow: (x: number) => `0 0 ${(100 - x) / 10}px rgb(0 0 0 / ${((100 - x) / 5) + 10}%)`,
const STACK_VAL_TO_STYLES: {
  left?: (x: number) => string,
  transform?: (x: number) => string,
} = avoidTransitionTransforms()
  ? { left: (x: number) => `${x}%` }
  : { transform: (x: number) => `translateZ(0) translateX(${x}%)` };

const STACK_STYLE_OPTS = TS.literal({
  stylesForFinalVal: {
    0: {
      position: 'absolute',
      top: 0,
    },
  },
  skipTransitionProps: ['position', 'top'],
} as const);

export default function StackWrapOuter({
  children,
}: React.PropsWithChildren) {
  const {
    key,
    path: routePath,
    replacedNavCount,
    historyState,
  } = useRouteStore();
  const { pendingNavState } = useHistoryStore();
  const {
    direction,
    isInitialLoad,
    prevState,
    nextState,
    isHome,
    isPrevHome,
    isNextHome,
    curStack,
    leftStack,
    rightStack,
    navCount,
  } = pendingNavState;

  // Compute using latest value from root stores rather than RouteStore
  const isCurStack = key === curStack.key;
  const isRightStack = key === rightStack?.key;
  const justReplaced = replacedNavCount === navCount;
  const slideIn = isCurStack
    && (direction === 'none'
      || (!isInitialLoad
        && !justReplaced
        && !!prevState
        && (prevState === leftStack || isPrevHome)));
  const slideOut = isRightStack
    && (direction === 'none'
      || (!isInitialLoad
        && !justReplaced
        && prevState === rightStack));

  // 0 = shown, 100 = hidden
  const isStackOnHome = isHome
    && ((key === prevState?.key && !isPrevHome)
      || (key === nextState?.key && !isNextHome));
  const animatedLeftPercent = useAnimatedValue(
    slideIn
      || isRightStack
      // Fix for stack -> home -> stack -> back to home -> refresh
      || isStackOnHome
      ? 100
      : 0,
    { debugName: `StackWrapOuter(${routePath})` },
  );
  const [stackRef, stackStyle] = useAnimation<HTMLDivElement>(
    animatedLeftPercent,
    `StackWrapOuter(${routePath})`,
  );

  useLayoutEffect(() => {
    if (!slideIn && !slideOut) {
      return undefined;
    }

    const raf = requestAnimationFrame(() => {
      if (slideIn) {
        animatedLeftPercent.setVal(0);
      } else if (slideOut) {
        animatedLeftPercent.setVal(100);
      }
    });

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [
    slideIn,
    slideOut,
    animatedLeftPercent,
    // In case back swipe navigation gets undone by popstate handler
    pendingNavState,
  ]);

  useEffect(() => {
    stackToAnimatedVal.set(historyState, animatedLeftPercent);

    return () => {
      stackToAnimatedVal.delete(historyState);
    };
  }, [historyState, animatedLeftPercent]);

  return (
    <>
      <Overlay
        animatedLeftPercent={animatedLeftPercent}
        routePath={routePath}
      />

      <div
        data-route={routePath}
        ref={stackRef}
        style={stackStyle(
          STACK_VAL_TO_STYLES,
          STACK_STYLE_OPTS,
        )}
        className={styles.container}
      >
        <ErrorBoundary
          Loading={<LoadingStackInnerRoute />}
          renderError={msg => <ErrorMsg msg={msg} />}
        >
          {children}
        </ErrorBoundary>
      </div>
    </>
  );
}
