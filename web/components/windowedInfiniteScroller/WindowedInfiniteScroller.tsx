import type { ColumnProps } from './WindowedInfiniteScrollerColumn';
import WindowedInfiniteScrollerColumn from './WindowedInfiniteScrollerColumn';
import useItemIdsToColumns from './useItemIdsToColumns';

import styles from './WindowedInfiniteScrollerStyles.scss';

type Props = {
  origItemIds: number[],
  addedItemIds: number[],
  deletedItemIds: Set<number>,
  initialId?: number,
  reverse: boolean,
  columns: number,
  columnMargin: number,
  className?: string,
  columnClassName?: string,
} & ColumnProps;

// Note: itemIds are append-only.
function WindowedInfiniteScroller({
  origItemIds,
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
  } = useItemIdsToColumns(origItemIds, addedItemIds, deletedItemIds, columns);

  const scrollParentRelative = useCallback((px: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop += px;
    }
  }, []);

  // todo: mid/hard with initialId, scroll to item and handle scrolling in opposite direction
  const initialIdIdx = initialId && origItemIds.indexOf(initialId);
  if (initialIdIdx && initialIdIdx >= 0) {
    for (let i = 0; i <= initialIdIdx; i++) {
      initialVisibleIds.add(origItemIds[i]);
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(styles.container, { [styles.reverse]: reverse }, className)}
    >
      {columns === 1
        ? (
          <WindowedInfiniteScrollerColumn
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
                <WindowedInfiniteScrollerColumn
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

export default React.memo(WindowedInfiniteScroller);
