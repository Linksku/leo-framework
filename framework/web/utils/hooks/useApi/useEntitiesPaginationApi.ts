import useHandleEntityEvent from 'utils/hooks/entities/useHandleEntityEvent';
import usePaginationApi from './usePaginationApi';

export type PaginatedEntitiesApiName = {
  [Name in ApiName]: ApiNameToData[Name] extends {
    items: number[];
    cursor?: string;
    hasCompleted: boolean;
  }
    ? Name
    : never;
}[ApiName];

export type ShouldAddCreatedEntity<T extends EntityType>
  = Memoed<(ent: TypeToEntity<T>) => boolean>;

export default function useEntitiesPaginationApi<
  Type extends EntityType,
  Name extends PaginatedEntitiesApiName,
>(
  entityType: Type,
  apiName: Name,
  apiParams: Memoed<ApiParams<Name>>,
  {
    apiKey,
    throttleTimeout,
    shouldAddCreatedEntity,
  }: {
    apiKey?: string,
    throttleTimeout?: number,
    shouldAddCreatedEntity?: ShouldAddCreatedEntity<Type> | true,
  } = {},
) {
  const [{
    addedEntityIds,
    deletedEntityIds,
  }, setState] = useState(() => ({
    addedEntityIds: EMPTY_ARR as Memoed<EntityId[]>,
    deletedEntityIds: new Set() as Set<EntityId>,
  }));

  const {
    items,
    fetching,
    fetchingFirstTime,
    fetchNext,
    hasCompleted,
    cursor,
  } = usePaginationApi<Name>(
    apiName,
    apiParams,
    {
      apiKey,
      throttleTimeout,
    },
  );

  useHandleEntityEvent(
    'create',
    entityType,
    useCallback((ent: TypeToEntity<Type>) => {
      if (shouldAddCreatedEntity === true || shouldAddCreatedEntity?.(ent)) {
        setState(s => {
          if (!items.includes(ent.id) && !items.includes(ent.id)) {
            return {
              ...s,
              addedEntityIds: markMemoed([...s.addedEntityIds, ent.id]),
            };
          }
          return s;
        });
      }
    }, [items, shouldAddCreatedEntity]),
  );

  useHandleEntityEvent(
    'delete',
    entityType,
    useCallback((ent: TypeToEntity<Type>) => {
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
    }, []),
  );

  return {
    fetching,
    fetchingFirstTime,
    items,
    addedEntityIds,
    deletedEntityIds,
    fetchNext,
    hasCompleted,
    cursor,
  };
}
