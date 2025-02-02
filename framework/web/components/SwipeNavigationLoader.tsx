import type { Props, Ret } from 'core/useSwipeNavigation';
import useSwipeNavigation from 'core/useSwipeNavigation';
import useEffectInitialMount from 'utils/useEffectInitialMount';

export default React.memo(function SwipeNavigationLoader<T extends HTMLElement>({ props, setRet }: {
  props: Props<T>,
  setRet: SetState<Ret<T>>,
}) {
  const ret = useSwipeNavigation(props);
  useEffectInitialMount(() => {
    setRet(ret);
  });

  return null;
});
