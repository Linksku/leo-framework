import type { EntityEvents } from 'utils/hooks/entities/useHandleEntityEvents';
import { useThrottle } from 'utils/throttle';
import useHandleEntityEvent from 'utils/hooks/entities/useHandleEntityEvent';
import useHandleEntityEvents from 'utils/hooks/entities/useHandleEntityEvents';

export type PaginatedApiName = {
  [Name in ApiName]: ApiParams<Name> extends {
    cursor?: string;
    limit?: number;
  }
    ? Name
    : never;
}[ApiName];

export type ShouldAddCreatedEntity<T extends EntityType>
  = Memoed<(ent: TypeToEntity<T>) => boolean>;

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
  }, setState] = useState({
    fetchedEntityIds: EMPTY_ARR as EntityId[],
    addedEntityIds: EMPTY_ARR as EntityId[],
    deletedEntityIds: new Set() as Set<EntityId>,
    cursor: undefined as string | undefined,
    hasCompleted: false,
  });
  const ref = useRef({
    nextCursor: undefined as string | undefined,
  });

  const { fetching, fetchingFirstTime, refetch } = useApi<Name>(
    apiName,
    // @ts-ignore idk
    {
      ...apiParams,
      cursor,
    },
    {
      onFetch(_data: any) {
        // todo: low/mid maybe create a superclass for scroller APIs.
        const data = _data as {
          entityIds: EntityId[],
          cursor?: string,
          hasCompleted: boolean,
        };
        ref.current.nextCursor = data?.cursor;
        setState(s => {
          const entityIdsSet = new Set([...s.fetchedEntityIds, ...s.addedEntityIds]);
          const fetchedIds = [...new Set(data?.entityIds as EntityId[] | undefined)];
          if (!process.env.PRODUCTION
            && data?.entityIds
            && fetchedIds.length !== data.entityIds.length) {
            throw new Error(`usePaginatedApi: duplicate ids in ${apiName}: ${data.entityIds.join(',')}`);
          }
          const newIds = fetchedIds.filter(id => !entityIdsSet.has(id));
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
      revalidateOnEvents: apiRevalidateOnEvents,
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

  useHandleEntityEvent('create', entityType, handleCreateEntity);
  useHandleEntityEvent('delete', entityType, handleDeleteEntity);

  useHandleEntityEvents(apiRevalidateOnEvents ?? EMPTY_ARR, useCallback(() => {
    setState(s => ({
      ...s,
      fetchedEntityIds: EMPTY_ARR,
      cursor: undefined,
      hasCompleted: false,
    }));
    refetch();
  }, [refetch]));

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
