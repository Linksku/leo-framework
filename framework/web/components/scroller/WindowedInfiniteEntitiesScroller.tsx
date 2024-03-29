import type { PaginatedEntitiesApiName } from 'hooks/api/usePaginationApi';
import type { ShouldAddCreatedEntity } from 'stores/ApiStore';
import usePaginationApi from 'hooks/api/usePaginationApi';
import usePrevious from 'hooks/usePrevious';

import type { PaginatedApiReturn } from 'hooks/api/usePaginationApi';
import type { ListItemRendererProps } from './WindowedInfiniteScrollerColumn';
import WindowedInfiniteScrollerInner, { Props as InnerProps } from './WindowedInfiniteScrollerInner';

type Props<
  T extends EntityType,
  Name extends PaginatedEntitiesApiName,
> = {
  apiName: Name,
  apiParams: Stable<ApiParams<Name>>,
  apiCacheBreaker?: string,
  apiInitialCursor?: string,
  entityType: T,
  throttleTimeout?: number,
  maxItems?: number,
  shouldAddCreatedEntity?: ShouldAddCreatedEntity<T>,
  shouldRemoveDeletedEntity?: boolean,
  columns?: number,
} & Omit<
  InnerProps<Entity<T>['id']>,
  keyof PaginatedApiReturn<any>
    | keyof ListItemRendererProps<Entity<T>['id']>
    | 'origItems'
    | 'apiError'
>;

function WindowedInfiniteEntitiesScroller<
  T extends EntityType,
  Name extends PaginatedEntitiesApiName,
>(
  props: Props<T, Name>
    & ListItemRendererProps<Entity<T>['id']>
    & { otherItemProps?: undefined },
): ReactElement;

function WindowedInfiniteEntitiesScroller<
  T extends EntityType,
  Name extends PaginatedEntitiesApiName,
  OtherProps extends ObjectOf<any>,
>(
  props: Props<T, Name>
    & ListItemRendererProps<Entity<T>['id'], OtherProps>,
): ReactElement;

// todo: low/hard reset state when apiParams changes so key prop isn't needed
function WindowedInfiniteEntitiesScroller<
  T extends EntityType,
  Name extends PaginatedEntitiesApiName,
>({
  apiName,
  apiParams,
  apiCacheBreaker,
  apiInitialCursor,
  entityType,
  throttleTimeout,
  maxItems,
  shouldAddCreatedEntity,
  shouldRemoveDeletedEntity = true,
  addedItems,
  deletedItems,
  columns = 1,
  ...props
}: Props<T, Name> & ListItemRendererProps<Entity<T>['id']>) {
  const prevCacheBreaker = usePrevious(apiCacheBreaker);
  if (prevCacheBreaker && prevCacheBreaker !== apiCacheBreaker) {
    ErrorLogger.warn(new Error(
      'WindowedInfiniteEntitiesScroller: apiCacheBreaker changed without key changing',
    ));
  }

  const {
    items,
    addedEntityIds,
    deletedEntityIds,
    hasCompleted,
    error,
    isFirstFetch,
    fetchNext,
  } = usePaginationApi(apiName, apiParams, {
    cacheBreaker: apiCacheBreaker,
    initialCursor: apiInitialCursor,
    throttleTimeout,
    maxItems,
    shouldAddCreatedEntity: shouldAddCreatedEntity as ShouldAddCreatedEntity<EntityType>,
    shouldRemoveDeletedEntity,
    paginationEntityType: entityType,
    addEntitiesToEnd: props.addEntitiesToEnd,
  });

  const allDeletedIds = useMemo(
    () => (deletedEntityIds && deletedItems
      ? new Set([...deletedEntityIds, ...deletedItems])
      : (deletedEntityIds ?? new Set(deletedItems))),
    [deletedEntityIds, deletedItems],
  );
  const allDeletedIdsIfNotEmpty = allDeletedIds.size ? allDeletedIds : null;
  const filteredItems = useMemo(
    () => (allDeletedIdsIfNotEmpty
      ? markStable(items.filter(
        id => !allDeletedIdsIfNotEmpty.has(id),
      ))
      : items),
    [items, allDeletedIdsIfNotEmpty],
  );
  const filteredAddedItems = useMemo(() => {
    if (!addedEntityIds.length && !addedItems?.length) {
      return EMPTY_ARR;
    }

    const itemsSet = new Set(items);
    // todo: low/mid sort scroller entities
    const newAddedItems = markStable([...addedEntityIds, ...(addedItems ?? [])]
      .filter(id => !allDeletedIds.has(id) && !itemsSet.has(id)));
    return newAddedItems.length ? newAddedItems : EMPTY_ARR;
  }, [items, addedEntityIds, addedItems, allDeletedIds]);

  return (
    <WindowedInfiniteScrollerInner
      key={columns}
      columns={columns}
      origItems={filteredItems}
      addedItems={filteredAddedItems}
      deletedItems={allDeletedIds}
      hasCompleted={hasCompleted}
      apiError={error}
      isFirstFetch={isFirstFetch}
      fetchNext={fetchNext}
      {...props}
    />
  );
}

export default WindowedInfiniteEntitiesScroller;
