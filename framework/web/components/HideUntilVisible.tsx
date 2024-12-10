import useVisibilityObserver from 'utils/useVisibilityObserver';
import { useRouteContainerRef } from 'stores/RouteStore';

import styles from './HideUntilVisible.scss';

type Props = {
  triggerHeight?: string,
  root?: Stable<HTMLElement> | null,
  rootMargin?: string,
  threshold?: number | Stable<number[]>,
};

export default function HideUntilVisible({
  triggerHeight = '100vh',
  rootMargin = '100px 0px',
  children,
  ...opts
}: React.PropsWithChildren<Props>) {
  const [shown, setShown] = useState(false);

  const routeContainerRef = useRouteContainerRef(true);

  const visibilityRef = useVisibilityObserver({
    onVisible: useCallback(() => {
      setShown(true);
    }, []),
    getRoot: useCallback(() => routeContainerRef?.current, [routeContainerRef]),
    rootMargin,
    ...opts,
  });

  return shown
    ? children
    : (
      <div
        ref={visibilityRef}
        className={styles.visibilityTrigger}
        style={{ height: triggerHeight }}
      />
    );
}
