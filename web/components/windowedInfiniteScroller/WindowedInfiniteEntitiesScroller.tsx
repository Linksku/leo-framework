import type { PaginatedApiName, ShouldAddCreatedEntity } from 'lib/hooks/useApi/usePaginatedApi';
import usePaginatedApi from 'lib/hooks/useApi/usePaginatedApi';
import useTimeComponentPerf from 'lib/hooks/useTimeComponentPerf';

import type { ItemRendererProps } from './WindowedInfiniteScrollerColumn';
import WindowedInfiniteScroller from './WindowedInfiniteScroller';

import styles from './WindowedInfiniteEntitiesScrollerStyles.scss';

type Props<
  Type extends EntityType,
  Name extends PaginatedApiName
> = {
  apiName: Name,
  apiParams: ApiParams<Name>,
  entityType: Type,
  initialId?: number,
  reverse?: boolean,
  throttleTimeout?: number,
  shouldAddCreatedEntity?: ShouldAddCreatedEntity<Type>,
  loadingComponent?: ReactNode,
  notFoundMsg?: ReactNode,
  columns?: number,
  columnMargin?: number,
  className?: string,
  columnClassName?: string,
};

function WindowedInfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedApiName
>(props: Props<Type, Name> & ItemRendererProps & { otherItemProps?: undefined }): ReactElement;

function WindowedInfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedApiName,
  OtherProps extends ObjectOf<any>
>(props: Props<Type, Name>
  & ItemRendererProps<OtherProps>
  & { otherItemProps: Memoed<OtherProps> }): ReactElement;

function WindowedInfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedApiName
>({
  apiName,
  apiParams,
  entityType,
  initialId,
  otherItemProps,
  ItemRenderer,
  reverse = false,
  throttleTimeout = 1000,
  shouldAddCreatedEntity,
  loadingComponent,
  notFoundMsg = 'Nothing found',
  columns = 1,
  columnMargin = 0,
  className,
  columnClassName,
}: Props<Type, Name> & ItemRendererProps) {
  useTimeComponentPerf(`WindowedScroller:${apiName}`);

  const {
    fetchingFirstTime,
    entityIds,
    fetchedEntityIds,
    addedEntityIds,
    deletedEntityIds,
    fetchNext,
    hasCompleted,
  } = usePaginatedApi(entityType, apiName, apiParams, {
    throttleTimeout,
    shouldAddCreatedEntity,
  });

  if (fetchingFirstTime && !entityIds.length && loadingComponent) {
    return loadingComponent;
  }
  if (fetchingFirstTime || entityIds.length) {
    return (
      <WindowedInfiniteScroller
        key={columns}
        origItemIds={fetchedEntityIds}
        addedItemIds={addedEntityIds}
        deletedItemIds={deletedEntityIds}
        initialId={initialId}
        // @ts-ignore no idea
        ItemRenderer={ItemRenderer}
        otherItemProps={otherItemProps}
        onReachedEnd={fetchNext}
        reverse={reverse}
        hasCompleted={hasCompleted}
        columns={columns}
        columnMargin={columnMargin}
        className={className}
        columnClassName={columnClassName}
      />
    );
  }
  if (typeof notFoundMsg === 'string') {
    return (
      <div className={styles.msg}>{notFoundMsg}</div>
    );
  }
  return <>{notFoundMsg}</>;
}

export default WindowedInfiniteEntitiesScroller;
