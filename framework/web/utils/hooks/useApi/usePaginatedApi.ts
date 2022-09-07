import type { EntityEvents } from 'utils/hooks/entities/useHandleEntityEvents';
import { useThrottle } from 'utils/throttle';
import useHandleEntityEvent from 'utils/hooks/entities/useHandleEntityEvent';
import useHandleEntityEvents from 'utils/hooks/entities/useHandleEntityEvents';
import useUpdate from 'utils/hooks/useUpdate';
import usePrevious from 'utils/hooks/usePrevious';
import shallowEqual from 'utils/shallowEqual';

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
  Name extends PaginatedApiName,
>(
  entityType: Type,
  apiName: Name,
  apiParams: ApiParams<Name>,
  {
    apiKey,
    throttleTimeout,
    shouldAddCreatedEntity,
    refetchApiOnEvents,
    addToEnd,
  }: {
    apiKey?: string,
    throttleTimeout?: number,
    shouldAddCreatedEntity?: ShouldAddCreatedEntity<Type>,
    refetchApiOnEvents?: EntityEvents,
    addToEnd?: boolean,
  } = {},
) {
  const { refetch, getApiState } = useApiStore();
  const [{
    fetchedEntityIds,
    addedEntityIds,
    deletedEntityIds,
    hasCompleted,
  }, setState] = useState(() => {
    const apiState = getApiState(apiName, apiParams, true);
    return {
      fetchedEntityIds: (apiState.data?.entityIds ?? EMPTY_ARR) as EntityId[],
      addedEntityIds: EMPTY_ARR as EntityId[],
      deletedEntityIds: new Set() as Set<EntityId>,
      hasCompleted: !!(apiState.data && (apiState.data.hasCompleted || !apiState.data.cursor)),
    };
  });
  const ref = useRef({
    cursor: undefined as string | undefined,
    nextCursor: undefined as string | undefined,
  });
  const update = useUpdate();

  const prevName = usePrevious(apiName);
  const prevParams = usePrevious(apiParams);
  if (apiName !== prevName || !shallowEqual(apiParams, prevParams)) {
    ref.current.cursor = undefined;
  }

  const fullParams = {
    // todo: low/mid memoize apiParams
    ...apiParams,
    cursor: ref.current.cursor,
  };
  const fullParamsMemoed = useDeepMemoObj(fullParams) as Memoed<ApiParams<Name>>;
  const { fetching, fetchingFirstTime } = useApi<Name>(
    apiName,
    fullParamsMemoed,
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
              // also, if order changed, it still shows old order
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
      key: apiKey,
      refetchOnMount: true,
    },
  );

  const fetchNext = useThrottle(
    () => {
      ref.current.cursor = ref.current.nextCursor;
      update();
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

  // todo: mid/mid clear cache if events occurred while component was unmounted
  useHandleEntityEvents(refetchApiOnEvents ?? EMPTY_ARR, useCallback(() => {
    setState(s => ({
      ...s,
      fetchedEntityIds: EMPTY_ARR,
      cursor: undefined,
      hasCompleted: false,
    }));
    refetch(apiName, fullParamsMemoed);
  }, [refetch, apiName, fullParamsMemoed]));

  const allEntityIds = addToEnd
    ? [...addedEntityIds, ...fetchedEntityIds]
    : [...fetchedEntityIds, ...addedEntityIds];
  return {
    fetching,
    fetchingFirstTime,
    entityIds: allEntityIds.filter(id => !deletedEntityIds.has(id)),
    fetchedEntityIds,
    addedEntityIds,
    deletedEntityIds,
    fetchNext,
    hasCompleted,
  };
}
