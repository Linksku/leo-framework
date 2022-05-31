import type { PaginatedApiName, ShouldAddCreatedEntity } from 'utils/hooks/useApi/usePaginatedApi';
import usePaginatedApi from 'utils/hooks/useApi/usePaginatedApi';
import useTimeComponentPerf from 'utils/hooks/useTimeComponentPerf';
import useVisibilityObserver from 'utils/hooks/useVisibilityObserver';

import styles from './InfiniteEntitiesScrollerStyles.scss';

type Props<
  Type extends EntityType,
  Name extends PaginatedApiName,
  // eslint-disable-next-line @typescript-eslint/ban-types
  OtherProps extends ObjectOf<any> = {}
> = {
  apiName: Name,
  apiParams: ApiParams<Name>,
  entityType: Type,
  ItemRenderer: React.MemoExoticComponent<React.ComponentType<{
    itemId: EntityId,
    prevItemId?: EntityId,
    nextItemId?: EntityId,
  } & OtherProps>>,
  throttleTimeout?: number,
  shouldAddCreatedEntity?: ShouldAddCreatedEntity<Type>,
  notFoundMsg?: ReactNode,
  className?: string,
};

function InfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedApiName
>(props: Props<Type, Name> & { otherItemProps?: undefined }): ReactElement;

function InfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedApiName,
  OtherProps extends ObjectOf<any>
>(props: Props<Type, Name, OtherProps> & { otherItemProps: Memoed<OtherProps> }): ReactElement;

function InfiniteEntitiesScroller<
  Type extends EntityType,
  Name extends PaginatedApiName,
  OtherProps
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
  useTimeComponentPerf(`Scroller:${apiName}`);

  const {
    fetching,
    fetchingFirstTime,
    entityIds,
    fetchNext,
    hasCompleted,
  } = usePaginatedApi(entityType, apiName, apiParams, {
    throttleTimeout,
    shouldAddCreatedEntity,
  });

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
            itemId={id}
            prevItemId={entityIds[idx - 1]}
            nextItemId={entityIds[idx + 1]}
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
