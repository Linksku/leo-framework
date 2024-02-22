import type { Props, Ret } from 'hooks/useSwipeNavigation';
import useSwipeNavigation from 'hooks/useSwipeNavigation';
import useEffectInitialMount from 'hooks/useEffectInitialMount';

export default function SwipeNavigationLoader<T extends HTMLElement>({ props, setRet }: {
  props: Props<T>,
  setRet: SetState<Ret<T>>,
}) {
  const ret = useSwipeNavigation(props);
  useEffectInitialMount(() => {
    setRet(ret);
  });

  return null;
}
