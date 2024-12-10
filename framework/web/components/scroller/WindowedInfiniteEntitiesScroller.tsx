import type { PaginatedEntitiesApiName } from 'stores/api/usePaginationApi';
import usePaginationApi from 'stores/api/usePaginationApi';
import usePrevious from 'utils/usePrevious';

import type { PaginationProps } from 'stores/api/usePaginationApi';
import type { InnerProps, ScrollerProps } from './WindowedInfiniteScroller';

const WindowedInfiniteScroller = reactLazy(() => import(
  /* webpackChunkName: 'deferred' */ './WindowedInfiniteScroller'
), null);

type Props<
  T extends EntityType,
  Name extends PaginatedEntitiesApiName,
> = {
  apiName: Name,
  apiParams: Stable<ApiParams<Name>>,
  apiEntityType: T,
  paginationOpts?: Stable<Exclude<PaginationProps<T>, 'paginationEntityType'>>,
  columns?: number,
} & Omit<
  ScrollerProps<Entity<T>['id'], any>,
  keyof InnerProps<string | number>
    | 'ItemRenderer'
    | 'otherItemProps'
>;

function WindowedInfiniteEntitiesScroller<
  T extends EntityType,
  Name extends PaginatedEntitiesApiName,
>(
  props: Props<T, Name>
    & Pick<ScrollerProps<Entity<T>['id'], any>, 'ItemRenderer'>
    & { otherItemProps?: undefined },
): ReactElement;

function WindowedInfiniteEntitiesScroller<
  T extends EntityType,
  Name extends PaginatedEntitiesApiName,
  OtherProps extends ObjectOf<any>,
>(
  props: Props<T, Name>
    & Pick<ScrollerProps<Entity<T>['id'], OtherProps>, 'ItemRenderer' | 'otherItemProps'>
): ReactElement;

// todo: low/hard reset state when apiParams changes so key prop isn't needed
function WindowedInfiniteEntitiesScroller<
  T extends EntityType,
  Name extends PaginatedEntitiesApiName,
>({
  apiName,
  apiParams,
  apiEntityType,
  paginationOpts,
  addedItems,
  deletedItems,
  columns = 1,
  ...props
}: Props<T, Name>
  & Pick<ScrollerProps<Entity<T>['id'], any>, 'ItemRenderer' | 'otherItemProps'>,
): ReactElement {
  const prevCacheBreaker = usePrevious(paginationOpts?.cacheBreaker);
  if (prevCacheBreaker && prevCacheBreaker !== paginationOpts?.cacheBreaker) {
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
    paginationEntityType: apiEntityType,
    ...paginationOpts,
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
    const newAddedItems = markStable([...addedEntityIds, ...(addedItems ?? [])]
      .filter(id => !allDeletedIds.has(id) && !itemsSet.has(id)));
    return newAddedItems.length ? newAddedItems : EMPTY_ARR;
  }, [items, addedEntityIds, addedItems, allDeletedIds]);

  return (
    <WindowedInfiniteScroller
      key={columns}
      columns={columns}
      origItems={filteredItems}
      addedItems={filteredAddedItems}
      deletedItems={allDeletedIds}
      hasCompleted={hasCompleted}
      error={error}
      isFirstFetch={isFirstFetch}
      fetchNext={fetchNext}
      {...props}
    />
  );
}

export default React.memo(
  WindowedInfiniteEntitiesScroller,
) as typeof WindowedInfiniteEntitiesScroller;
