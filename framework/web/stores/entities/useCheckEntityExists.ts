import { DEFAULT_API_TIMEOUT } from 'consts/server';
import { useHadRouteBeenActive, useIsRouteVisible } from 'stores/RouteStore';
import useAccumulatedVal from 'utils/useAccumulatedVal';

// todo: low/easy handle checkEntityExists payload too large
function useCheckEntityExists(
  entityType: EntityType | null,
  partial: Stable<ObjectOf<string | number | null>> | null,
  entity: Entity | null,
) {
  const [waited, setWaited] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  // Prevents shouldFetch from flipping back to false
  const hadNoEntity = useAccumulatedVal(
    false,
    s => s || !entity,
  );

  const err = new Error(
    `checkEntityExists: ${entityType} ${JSON.stringify(partial)} exists, but not available in client`,
  );
  useApi(
    'checkEntityExists',
    useMemo(
      () => (entityType && partial
        ? {
          entityType,
          entityPartial: partial,
        }
        : null),
      [entityType, partial],
    ),
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

  const isRouteVisible = useIsRouteVisible(true) ?? true;
  const hadBeenActive = useHadRouteBeenActive(true) ?? true;
  const shouldCheck = hadBeenActive && isRouteVisible && partial != null && !entity;

  useEffect(() => {
    if (!shouldCheck) {
      return undefined;
    }

    timerRef.current = window.setTimeout(() => {
      setWaited(true);
    }, DEFAULT_API_TIMEOUT);

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
