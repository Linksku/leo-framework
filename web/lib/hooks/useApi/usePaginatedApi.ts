import type { EntityEvents } from 'lib/hooks/entities/useHandleEntityEvents';
import { useThrottle } from 'lib/throttle';
import useHandleEntityEvents from 'lib/hooks/entities/useHandleEntityEvents';

export type PaginatedApiName = {
  [Name in ApiName]: ApiParams<Name> extends {
    cursor?: string;
    limit?: number;
  }
    ? Name
    : never;
}[ApiName];

export type ShouldAddCreatedEntity<Type extends EntityType>
  = Memoed<(ent: TypeToEntity<Type>) => boolean>;

export default function usePaginatedApi<
  Type extends EntityType,
  Name extends PaginatedApiName
>(
  entityType: Type,
  apiName: Name,
  apiParams: ApiParams<Name>,
  {
    throttleTimeout,
    shouldAddCreatedEntity,
    apiRevalidateOnEvents,
  }: {
    throttleTimeout?: number,
    shouldAddCreatedEntity?: ShouldAddCreatedEntity<Type>,
    apiRevalidateOnEvents?: EntityEvents,
  } = {},
) {
  const [{
    fetchedEntityIds,
    addedEntityIds,
    deletedEntityIds,
    cursor,
    hasCompleted,
    revalidateCount,
  }, setState] = useState({
    fetchedEntityIds: EMPTY_ARR as number[],
    addedEntityIds: EMPTY_ARR as number[],
    deletedEntityIds: new Set() as Set<number>,
    cursor: undefined as string | undefined,
    hasCompleted: false,
    revalidateCount: 0,
  });
  const ref = useRef({
    nextCursor: undefined as string | undefined,
  });
  const { addEntityListener } = useEntitiesStore();

  const { fetching, fetchingFirstTime } = useApi<Name>(
    apiName,
    {
      ...apiParams,
      cursor,
    },
    {
      revalidateKey: `${revalidateCount}`,
      onFetch(_data: any) {
        // todo: low/mid maybe create a superclass for scroller APIs.
        const data = _data as {
          entityIds: number[],
          cursor?: string,
          hasCompleted: boolean,
        };
        ref.current.nextCursor = data?.cursor;
        setState(s => {
          const entityIdsSet = new Set([...s.fetchedEntityIds, ...s.addedEntityIds]);
          const fetchedIds = [...new Set(data?.entityIds as number[] | undefined)];
          if (process.env.NODE_ENV !== 'production'
            && data?.entityIds
            && fetchedIds.length !== data.entityIds.length) {
            throw new Error(`usePaginatedApi: duplicate ids in ${apiName}: ${data.entityIds.join(',')}`);
          }
          const newIds = fetchedIds.filter((id: number) => !entityIdsSet.has(id));
          return ({
            ...s,
            fetchedEntityIds: newIds.length
              // todo: high/hard after refetching, if new entities were loaded, they have the wrong position
              // e.g. new replies on top instead of bottom
              ? [...s.fetchedEntityIds, ...newIds]
              : s.fetchedEntityIds,
            hasCompleted: data.hasCompleted || !data.cursor,
          });
        });
      },
      onError() {
        // todo: mid/mid retry fetching x times
        setState(s => (s.hasCompleted ? s : { ...s, hasCompleted: true }));
      },
      shouldFetch: !hasCompleted,
    },
  );

  const fetchNext = useThrottle(
    () => {
      if (ref.current.nextCursor) {
        setState(s => (
          s.cursor === ref.current.nextCursor
            ? s
            : ({ ...s, cursor: ref.current.nextCursor })
        ));
      }
    },
    useDeepMemoObj({
      timeout: throttleTimeout ?? 100,
      allowSchedulingDuringDelay: true,
    }),
    [],
  );

  const handleCreateEntity = useCallback((ent: TypeToEntity<Type>) => {
    if (!shouldAddCreatedEntity || shouldAddCreatedEntity(ent)) {
      setState(s => {
        if (!s.fetchedEntityIds.includes(ent.id) && !s.addedEntityIds.includes(ent.id)) {
          return {
            ...s,
            addedEntityIds: [...s.addedEntityIds, ent.id],
          };
        }
        return s;
      });
    }
  }, [shouldAddCreatedEntity]);

  const handleDeleteEntity = useCallback((ent: TypeToEntity<Type>) => {
    setState(s => {
      if (!s.deletedEntityIds.has(ent.id)) {
        const newSet = new Set(s.deletedEntityIds);
        newSet.add(ent.id);
        return {
          ...s,
          deletedEntityIds: newSet,
        };
      }
      return s;
    });
  }, []);

  useEffect(() => {
    const offCreate = addEntityListener('create', entityType, handleCreateEntity);
    const offDelete = addEntityListener('delete', entityType, handleDeleteEntity);

    return () => {
      offCreate();
      offDelete();
    };
  }, [addEntityListener, entityType, handleCreateEntity, handleDeleteEntity]);

  useHandleEntityEvents(apiRevalidateOnEvents ?? EMPTY_ARR, useCallback(() => {
    setState(s => ({
      ...s,
      fetchedEntityIds: EMPTY_ARR,
      cursor: undefined,
      hasCompleted: false,
      revalidateCount: s.revalidateCount + 1,
    }));
  }, []));

  return {
    fetching,
    fetchingFirstTime,
    entityIds: [...addedEntityIds, ...fetchedEntityIds].filter(id => !deletedEntityIds.has(id)),
    fetchedEntityIds,
    addedEntityIds,
    deletedEntityIds,
    fetchNext,
    hasCompleted,
  };
}
