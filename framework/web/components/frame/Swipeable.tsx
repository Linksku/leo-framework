import type { Props as SwipeProps, Ret as SwipeRet } from 'hooks/useSwipeNavigation';
import mergeRefs from 'utils/mergeRefs';

const SwipeNavigationLoader = React.lazy(async () => import(
  /* webpackChunkName: 'deferred' */ './SwipeNavigationLoader'
));

export type Props = {
  swipeProps: SwipeProps<HTMLElement>,
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
        setRet={markStable(setRet)}
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
