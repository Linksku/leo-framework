import type { Props as SwipeProps, Ret as SwipeRet } from 'core/useSwipeNavigation';
import mergeRefs from 'utils/mergeRefs';

const SwipeNavigationLoader = reactLazy(() => import(
  /* webpackChunkName: 'deferred' */ './SwipeNavigationLoader'
), null);

export type Props = {
  swipeProps: Stable<SwipeProps<HTMLElement>>,
} & React.HTMLAttributes<HTMLDivElement>;

function Swipeable(
  {
    swipeProps,
    children,
    style,
    ...props
  }: React.PropsWithChildren<
    Props
  >,
  forwardedRef?: React.ForwardedRef<HTMLDivElement>,
) {
  const [{ ref: swipeRef, bindSwipe }, setRet] = React.useState<SwipeRet<HTMLElement>>({
    ref: useRef(null),
    bindSwipe: () => ({}),
  });

  return (
    <>
      <SwipeNavigationLoader
        props={swipeProps}
        setRet={setRet as Stable<SetState<SwipeRet<HTMLElement>>>}
      />
      <div
        {...props}
        {...bindSwipe()}
        ref={mergeRefs(
          swipeRef,
          forwardedRef,
        )}
        style={{
          ...style,
          overscrollBehaviorX: swipeProps.direction === 'left' || swipeProps.direction === 'right'
            ? 'none'
            : undefined,
          overscrollBehaviorY: swipeProps.direction === 'up' || swipeProps.direction === 'down'
            ? 'none'
            : undefined,
        }}
      >
        {children}
      </div>
    </>
  );
}

export default React.forwardRef(Swipeable);
