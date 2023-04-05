import type { Props as SwipeNavigationProps } from 'hooks/useSwipeNavigation';
import useSwipeNavigation from 'hooks/useSwipeNavigation';
import mergeRefs from 'utils/mergeRefs';

export type Props = {
  swipeProps: SwipeNavigationProps<HTMLDivElement>,
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
  const { ref: swipeRef, bindSwipe } = useSwipeNavigation<HTMLDivElement>(swipeProps);

  return (
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
  );
}

export default React.forwardRef(Swipeable);
