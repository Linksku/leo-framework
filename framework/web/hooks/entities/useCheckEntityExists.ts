import { API_TIMEOUT } from 'consts/server';
import { useHadRouteBeenActive, useIsRouteVisible } from 'stores/RouteStore';
import useUpdatedState from 'hooks/useUpdatedState';

function useCheckEntityExists(
  entityType: EntityType | null,
  partial: Stable<ObjectOf<string | number | null>> | null,
  entity: Entity | null,
) {
  const [waited, setWaited] = useState(false);
  const timerRef = useRef<number | undefined>();
  // Prevents shouldFetch from flipping back to false
  const hadNoEntity = useUpdatedState(
    !entity,
    s => s || !entity,
  );

  const err = new Error(
    `checkEntityExists: ${entityType} ${JSON.stringify(partial)} exists, but not available in client`,
  );
  useApi(
    'checkEntityExists',
    useMemo(() => ({
      entityType: entityType ?? '',
      entityPartial: partial ?? {},
    }), [entityType, partial]),
    {
      shouldFetch: !!(waited && entityType && partial && hadNoEntity),
      onFetch({ exists }) {
        if (exists && !entity) {
          ErrorLogger.warn(err);
        }
      },
      batchInterval: 1000,
    },
  );

  let isRouteVisible = true;
  let hadBeenActive = true;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isRouteVisible = useIsRouteVisible();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hadBeenActive = useHadRouteBeenActive();
  } catch {}
  const shouldCheck = hadBeenActive && isRouteVisible && partial != null && !entity;

  useEffect(() => {
    if (!shouldCheck) {
      return undefined;
    }

    timerRef.current = window.setTimeout(() => {
      setWaited(true);
    }, API_TIMEOUT);

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [shouldCheck]);
}

export default process.env.PRODUCTION
  ? function useCheckEntityExistsProd(
    _entityType: EntityType | null,
    _partial: Stable<ObjectOf<string | number | null>> | null,
    _entity: Entity | null,
  ) {
    // pass
  }
  : useCheckEntityExists;
