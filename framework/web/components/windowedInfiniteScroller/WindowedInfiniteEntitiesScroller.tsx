import type { PaginatedEntitiesApiName, ShouldAddCreatedEntity } from 'hooks/useApi/useEntitiesPaginationApi';
import useEntitiesPaginationApi from 'hooks/useApi/useEntitiesPaginationApi';

import type { ListItemRendererProps } from './WindowedInfiniteScrollerColumn';
import WindowedInfiniteScrollerInner, { Props as InnerProps } from './WindowedInfiniteScrollerInner';

type Props<
  Type extends EntityType,
  Name extends PaginatedEntitiesApiName,
> = {
  apiName: Name,
  apiParams: Memoed<ApiParams<Name>>,
  apiKey?: string,
  entityType: Type,
  throttleTimeout?: number,
  shouldAddCreatedEntity?: ShouldAddCreatedEntity<Type> | true,
  columns?: number,
} & Omit<
  InnerProps,
  'origItems' | 'addedItems' | 'deletedItems'
    | 'cursor' | 'hasCompleted' | 'fetchingFirstTime' | 'fetchNext'
    | keyof ListItemRendererProps
>;

function WindowedInfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedEntitiesApiName,
>(props: Props<Type, Name> & ListItemRendererProps & { otherItemProps?: undefined }): ReactElement;

function WindowedInfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedEntitiesApiName,
  OtherProps extends ObjectOf<any>,
>(props: Props<Type, Name>
  & ListItemRendererProps<OtherProps>
  & { otherItemProps: Memoed<OtherProps> }): ReactElement;

function WindowedInfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedEntitiesApiName,
>({
  apiName,
  apiParams,
  apiKey,
  entityType,
  throttleTimeout = 1000,
  shouldAddCreatedEntity,
  columns = 1,
  ...props
}: Props<Type, Name> & ListItemRendererProps) {
  const {
    fetchingFirstTime,
    items,
    addedEntityIds,
    deletedEntityIds,
    fetchNext,
    hasCompleted,
    cursor,
  } = useEntitiesPaginationApi(entityType, apiName, apiParams, {
    apiKey,
    throttleTimeout,
    shouldAddCreatedEntity,
  });

  return (
    <WindowedInfiniteScrollerInner
      key={columns}
      origItems={items}
      addedItems={addedEntityIds}
      deletedItems={deletedEntityIds}
      fetchNext={fetchNext}
      hasCompleted={hasCompleted}
      cursor={cursor}
      fetchingFirstTime={fetchingFirstTime}
      columns={columns}
      {...props}
    />
  );
}

export default WindowedInfiniteEntitiesScroller;
