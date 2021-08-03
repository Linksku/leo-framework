import { useThrottle } from 'lib/throttle';

export type PaginatedApiName = {
  [Name in ApiName]: ApiNameToParams[Name] extends {
    cursor?: number;
    limit?: number;
  }
    ? Name
    : never;
}[ApiName];

export type ShouldAddCreatedEntity = Memoed<(id: number) => boolean>;

export default function usePaginatedApi<
  Type extends EntityType,
  Name extends PaginatedApiName
>(
  entityType: Type,
  apiName: Name,
  apiParams: ApiNameToParams[Name],
  {
    throttleTimeout,
    shouldAddCreatedEntity,
  }: {
    throttleTimeout?: number,
    shouldAddCreatedEntity?: ShouldAddCreatedEntity,
  } = {},
) {
  const [{
    fetchedEntityIds,
    addedEntityIds,
    deletedEntityIds,
    cursor,
    hasCompleted,
  }, setState] = useState({
    fetchedEntityIds: EMPTY_ARR as number[],
    addedEntityIds: EMPTY_ARR as number[],
    deletedEntityIds: new Set() as Set<number>,
    cursor: undefined as number | undefined,
    hasCompleted: false,
  });
  const ref = useRef({
    nextCursor: undefined,
  });
  const { addEntityListener } = useEntitiesStore();

  const { fetching, fetchingFirstTime } = useApi<Name>(
    apiName,
    {
      ...apiParams,
      cursor,
    },
    {
      onFetch: useCallback((data: any) => {
      // todo: low/mid maybe create a superclass for scroller APIs.
        ref.current.nextCursor = data?.cursor;
        setState(s => {
          const entityIdsSet = new Set([...s.fetchedEntityIds, ...s.addedEntityIds]);
          const fetchedIds = [...new Set(data?.entityIds as number[] | undefined)];
          if (process.env.NODE_ENV !== 'production'
            && data?.entityIds
            && fetchedIds.length !== data.entityIds.length) {
            throw new Error(`usePaginatedApi: duplicate ids in ${apiName}`);
          }
          const newIds = fetchedIds.filter((id: number) => !entityIdsSet.has(id));
          return ({
            ...s,
            fetchedEntityIds: newIds.length
              ? [...s.fetchedEntityIds, ...newIds]
              : s.fetchedEntityIds,
            hasCompleted: data.hasCompleted || !data.cursor,
          });
        });
      }, [apiName]),
      onError: useCallback(() => {
      // todo: mid/mid retry fetching x times
        setState(s => ({ ...s, hasCompleted: true }));
      }, []),
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
    {
      timeout: throttleTimeout ?? 100,
      allowSchedulingDuringDelay: true,
    },
    [],
  );

  const handleCreateEntity = useCallback((id: number) => {
    if (!shouldAddCreatedEntity || shouldAddCreatedEntity(id)) {
      setState(s => {
        if (!s.fetchedEntityIds.includes(id) && !s.addedEntityIds.includes(id)) {
          return {
            ...s,
            addedEntityIds: [...s.addedEntityIds, id],
          };
        }
        return s;
      });
    }
  }, [shouldAddCreatedEntity]);

  const handleDeleteEntity = useCallback((id: number) => {
    setState(s => {
      if (!s.deletedEntityIds.has(id)) {
        const newSet = new Set(s.deletedEntityIds);
        newSet.add(id);
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
