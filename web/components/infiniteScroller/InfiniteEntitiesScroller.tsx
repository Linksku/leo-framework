import { useThrottle } from 'lib/throttle';
import useTimeComponentPerf from 'lib/hooks/useTimeComponentPerf';

import type { RenderItemType } from './InfiniteScrollerColumn';
import InfiniteScroller from './InfiniteScroller';

import styles from './InfiniteEntitiesScrollerStyles.scss';

type ScrollerApiName = {
  [Name in ApiName]: ApiNameToParams[Name] extends {
    cursor?: number;
    limit?: number;
  }
    ? Name
    : never;
}[ApiName];

type Props<Name extends ScrollerApiName> = {
  apiName: Name,
  apiParams: ApiNameToParams[Name],
  itemsPerFetch?: number,
  entityType: EntityType,
  initialId?: number,
  renderItem: RenderItemType,
  reverse?: boolean,
  throttleTimeout?: number,
  shouldAddCreatedEntity?: Memoed<(e: Entity) => boolean>,
  notFoundMsg?: ReactNode,
  columns?: number,
  columnMargin?: number,
  className?: string,
  columnClassName?: string,
};

export default function InfiniteEntitiesScroller<Name extends ScrollerApiName>({
  apiName,
  apiParams,
  itemsPerFetch = 30,
  entityType,
  initialId,
  renderItem,
  reverse = false,
  throttleTimeout = 1000,
  shouldAddCreatedEntity,
  notFoundMsg = 'Nothing found',
  columns = 1,
  columnMargin = 0,
  className,
  columnClassName,
}: Props<Name>) {
  useTimeComponentPerf('Scroller');

  const [{
    entityIds,
    addedEntityIds,
    deletedEntityIds,
    cursor,
    hasCompleted,
  }, setState] = useState({
    entityIds: EMPTY_ARR as number[],
    addedEntityIds: EMPTY_ARR as number[],
    deletedEntityIds: EMPTY_ARR as number[],
    cursor: undefined as number | undefined,
    hasCompleted: false,
  });
  const ref = useRef({
    nextCursor: undefined,
  });
  const eventEmitter = useEntitiesEE();

  const { fetching } = useApi<Name>(apiName, {
    ...apiParams,
    cursor,
    limit: itemsPerFetch,
  }, {
    onFetch: useCallback((data: any) => {
      // todo: low/mid maybe create a superclass for scroller APIs.
      ref.current.nextCursor = data?.cursor;
      setState(s => {
        const entityIdsSet = new Set([...s.entityIds, ...s.addedEntityIds]);
        const fetchedEntityIds = (data?.entityIds ?? []) as number[];
        const newIds = fetchedEntityIds.filter((id: number) => !entityIdsSet.has(id));
        return ({
          ...s,
          entityIds: newIds.length
            ? [...s.entityIds, ...newIds.filter((id: number) => !entityIdsSet.has(id))]
            : s.entityIds,
          hasCompleted: data.hasCompleted || !data.cursor,
        });
      });
    }, []),
    onError: NOOP,
    shouldFetch: !hasCompleted,
  });

  const fetchNextEntities = useThrottle(
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
      timeout: throttleTimeout,
      allowSchedulingDuringDelay: true,
    },
    [],
  );

  const handleCreateEntity = useCallback(entity => {
    if (entity.type === entityType && shouldAddCreatedEntity?.(entity)) {
      setState(s => {
        if (s.entityIds.includes(entity.id) || s.addedEntityIds.includes(entity.id)) {
          return s;
        }
        return {
          ...s,
          addedEntityIds: [...s.addedEntityIds, entity.id],
        };
      });
    }
  }, [entityType, shouldAddCreatedEntity]);

  const handleDeleteEntity = useCallback(entity => {
    setState(s => {
      if (s.deletedEntityIds.includes(entity.id)) {
        return s;
      }
      return {
        ...s,
        deletedEntityIds: [...s.deletedEntityIds, entity.id],
      };
    });
  }, []);

  useEffect(() => {
    eventEmitter.on(`create,${entityType}`, handleCreateEntity);
    eventEmitter.on(`delete,${entityType}`, handleDeleteEntity);

    return () => {
      eventEmitter.off(`create,${entityType}`, handleCreateEntity);
      eventEmitter.off(`delete,${entityType}`, handleDeleteEntity);
    };
  }, [eventEmitter, entityType, handleCreateEntity, handleDeleteEntity]);

  if (fetching || entityIds.length || addedEntityIds.length) {
    return (
      <InfiniteScroller
        key={columns}
        itemIds={entityIds}
        addedItemIds={addedEntityIds}
        deletedItemIds={deletedEntityIds}
        initialId={initialId}
        renderItem={renderItem}
        onReachedEnd={fetchNextEntities}
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
