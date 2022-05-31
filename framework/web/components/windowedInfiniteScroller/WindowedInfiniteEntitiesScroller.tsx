import type { PaginatedApiName, ShouldAddCreatedEntity } from 'utils/hooks/useApi/usePaginatedApi';
import type { EntityEvents } from 'utils/hooks/entities/useHandleEntityEvents';
import usePaginatedApi from 'utils/hooks/useApi/usePaginatedApi';
import useTimeComponentPerf from 'utils/hooks/useTimeComponentPerf';

import type { ItemRendererProps } from './WindowedInfiniteScrollerColumn';
import WindowedInfiniteScroller from './WindowedInfiniteScroller';

import styles from './WindowedInfiniteEntitiesScrollerStyles.scss';

type Props<
  Type extends EntityType,
  Name extends PaginatedApiName
> = {
  apiName: Name,
  apiParams: ApiParams<Name>,
  apiRevalidateOnEvents?: EntityEvents,
  entityType: Type,
  initialId?: EntityId,
  reverse?: boolean,
  throttleTimeout?: number,
  shouldAddCreatedEntity?: ShouldAddCreatedEntity<Type>,
  loadingComponent?: Memoed<ReactNode>,
  notFoundMsg?: Memoed<ReactNode>,
  completedMsg?: Memoed<ReactNode>,
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
  apiRevalidateOnEvents,
  entityType,
  initialId,
  otherItemProps,
  ItemRenderer,
  reverse = false,
  throttleTimeout = 1000,
  shouldAddCreatedEntity,
  loadingComponent,
  notFoundMsg = 'Nothing found',
  completedMsg = null,
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
    apiRevalidateOnEvents,
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
        completedMsg={completedMsg}
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
