import type { ColumnProps } from './InfiniteScrollerColumn';
import InfiniteScrollerColumn from './InfiniteScrollerColumn';
import useItemIdsToColumns from './useItemIdsToColumns';

import styles from './InfiniteScrollerStyles.scss';

type Props = {
  itemIds: number[],
  addedItemIds: number[],
  deletedItemIds: number[],
  initialId?: number,
  reverse: boolean,
  columns: number,
  columnMargin: number,
  className?: string,
  columnClassName?: string,
} & ColumnProps;

// Note: itemIds are append-only.
function InfiniteScroller({
  itemIds,
  addedItemIds,
  deletedItemIds,
  initialId,
  reverse,
  columns,
  columnMargin,
  className,
  columnClassName,
  ...props
}: Props) {
  if (process.env.NODE_ENV !== 'production' && reverse && columns > 1) {
    throw new Error('Reverse scroller only works with 1 column.');
  }

  const containerRef = useRef<HTMLDivElement>(null);

  const {
    columnItemIds,
    idToItem,
    initialVisibleIds,
  } = useItemIdsToColumns(itemIds, addedItemIds, deletedItemIds, columns);

  const scrollParentRelative = useCallback((px: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop += px;
    }
  }, []);

  const initialIdIdx = initialId && itemIds.indexOf(initialId);
  if (initialIdIdx && initialIdIdx >= 0) {
    for (let i = 0; i <= initialIdIdx; i++) {
      initialVisibleIds.add(itemIds[i]);
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(styles.container, { [styles.reverse]: reverse }, className)}
    >
      {columns === 1
        ? (
          <InfiniteScrollerColumn
            {...props}
            columnIdx={0}
            itemIds={columnItemIds[0]}
            initialVisibleIds={initialVisibleIds}
            scrollParentRelative={scrollParentRelative}
            idToItem={idToItem}
            reverse={reverse}
          />
        )
        : (
          <div className={styles.columns}>
            {columnItemIds.map((ids, columnIdx) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={columnIdx}
                className={cn(styles.column, columnClassName)}
                style={{
                  paddingLeft: columnIdx === 0 ? 0 : columnMargin,
                }}
              >
                <InfiniteScrollerColumn
                  {...props}
                  columnIdx={columnIdx}
                  itemIds={ids}
                  initialVisibleIds={initialVisibleIds}
                  scrollParentRelative={scrollParentRelative}
                  idToItem={idToItem}
                  reverse={reverse}
                />
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

export default React.memo(InfiniteScroller);
