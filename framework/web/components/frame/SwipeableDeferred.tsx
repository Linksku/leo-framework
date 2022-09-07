import useUpdate from 'utils/hooks/useUpdate';
import useMountedState from 'utils/hooks/useMountedState';
import type SwipeableType from './Swipeable';
import type { Props } from './Swipeable';

let importPromise: Promise<void> | null = null;
let Swipeable: typeof SwipeableType | null = null;

// Can't use because children gets remounted:
// https://stackoverflow.com/q/66251637/599184
function SwipeableDeferred(
  {
    swipeProps,
    children,
    ...props
  }: React.PropsWithChildren<Props>,
  ref?: React.ForwardedRef<HTMLDivElement>,
) {
  const mountedState = useMountedState();
  const update = useUpdate();
  const didRunThen = useRef(false);

  useEffect(() => {
    if (!Swipeable) {
      if (!importPromise) {
        importPromise = import(/* webpackChunkName: 'deferred' */ './Swipeable')
          .then(module => {
            importPromise = null;
            Swipeable = module.default;
          });
        importPromise.catch(err => {
          importPromise = null;
          ErrorLogger.warn(err, 'Load Swipeable');
        });
      }

      if (!didRunThen.current) {
        wrapPromise(
          importPromise.then(() => {
            if (mountedState()) {
              update();
            }
          }),
          'warn',
          'Import Swipeable',
        );
        didRunThen.current = true;
      }
    }
  }, [mountedState, update]);

  return Swipeable
    ? (
      <Swipeable key="children" {...props} ref={ref} swipeProps={swipeProps}>
        {children}
      </Swipeable>
    )
    : (
      <div key="children" {...props} ref={ref}>
        {children}
      </div>
    );
}

export default React.forwardRef(SwipeableDeferred);