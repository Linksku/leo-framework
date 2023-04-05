import type { PaginatedEntitiesApiName, ShouldAddCreatedEntity } from 'hooks/useApi/useEntitiesPaginationApi';
import useEntitiesPaginationApi from 'hooks/useApi/useEntitiesPaginationApi';
import useVisibilityObserver from 'hooks/useVisibilityObserver';

import styles from './InfiniteEntitiesScrollerStyles.scss';

type Props<
  Type extends EntityType,
  Name extends PaginatedEntitiesApiName,
  // eslint-disable-next-line @typescript-eslint/ban-types
  OtherProps extends ObjectOf<any> = {},
> = {
  apiName: Name,
  apiParams: Memoed<ApiParams<Name>>,
  entityType: Type,
  ItemRenderer:
    React.MemoExoticComponent<React.ComponentType<{
      item: EntityId,
      aboveItem?: EntityId,
      belowItem?: EntityId,
    } & OtherProps>>
    | React.NamedExoticComponent<{
      item: EntityId,
      aboveItem?: EntityId,
      belowItem?: EntityId,
    } & OtherProps>,
  throttleTimeout?: number,
  shouldAddCreatedEntity?: ShouldAddCreatedEntity<Type>,
  notFoundMsg?: ReactNode,
  className?: string,
};

function InfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedEntitiesApiName,
>(props: Props<Type, Name> & { otherItemProps?: undefined }): ReactElement;

function InfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedEntitiesApiName,
  OtherProps extends ObjectOf<any>,
>(props: Props<Type, Name, OtherProps> & { otherItemProps: Memoed<OtherProps> }): ReactElement;

function InfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedEntitiesApiName,
  OtherProps extends ObjectOf<any>,
>({
  apiName,
  apiParams,
  entityType,
  ItemRenderer,
  otherItemProps,
  throttleTimeout = 1000,
  shouldAddCreatedEntity,
  notFoundMsg = 'Nothing found',
  className,
}: Props<Type, Name, OtherProps> & { otherItemProps?: OtherProps }) {
  const {
    fetching,
    fetchingFirstTime,
    items,
    addedEntityIds,
    deletedEntityIds,
    fetchNext,
    hasCompleted,
  } = useEntitiesPaginationApi(entityType, apiName, apiParams, {
    throttleTimeout,
    shouldAddCreatedEntity,
  });
  const entityIds = [...addedEntityIds, ...items]
    .filter(id => !deletedEntityIds.has(id));

  const loadMoreRef = useVisibilityObserver({
    onVisible: fetchNext,
  });

  if (fetchingFirstTime || entityIds.length) {
    return (
      <div className={className}>
        {entityIds.map((id, idx) => (
          // @ts-ignore no idea
          <ItemRenderer
            key={id}
            item={id}
            aboveItem={entityIds[idx - 1]}
            belowItem={entityIds[idx + 1]}
            {...otherItemProps}
          />
        ))}
        {fetching && !hasCompleted && (
          <div className={styles.spinner}>
            <Spinner />
          </div>
        )}
        {!fetching && !hasCompleted && (
          <div
            ref={loadMoreRef}
            className={styles.loadMore}
          />
        )}
      </div>
    );
  }
  if (typeof notFoundMsg === 'string') {
    return (
      <div className={styles.msg}>{notFoundMsg}</div>
    );
  }
  return <>{notFoundMsg}</>;
}

export default InfiniteEntitiesScroller;
