import type { ColumnProps } from './WindowedInfiniteScrollerColumn';
import WindowedInfiniteScrollerColumn from './WindowedInfiniteScrollerColumn';
import useItemsToColumns from './useItemsToColumns';

import styles from './WindowedInfiniteScrollerInnerStyles.scss';

export type Props = {
  origItems: Memoed<EntityId[]>,
  addedItems?: Memoed<EntityId[]>,
  deletedItems?: Memoed<Set<EntityId>>,
  fetchingFirstTime?: boolean,
  fetchNext: () => void,
  hasCompleted: boolean,
  cursor: string | undefined,
  reverse?: boolean,
  addToEnd?: boolean,
  initialId?: EntityId,
  columns?: number,
  loadingElement?: Memoed<ReactElement>,
  estimateItemHeight?: Memoed<(item: string | number, avgHeight: number) => number>,
  notFoundMsg?: Memoed<ReactNode>,
  endMsg?: Memoed<ReactNode>,
  topElement?: Memoed<ReactElement>,
  bottomElement?: Memoed<ReactElement>,
  className?: string,
  columnClassName?: string,
} & Omit<ColumnProps, 'hasReachedEnd' | 'onReachEnd'>;

// Note: items are append-only.
export default React.memo(function WindowedInfiniteScrollerInner({
  origItems,
  addedItems,
  deletedItems,
  fetchingFirstTime,
  fetchNext,
  hasCompleted,
  cursor,
  reverse = false,
  addToEnd = false,
  initialId,
  columns = 1,
  loadingElement,
  estimateItemHeight,
  notFoundMsg = 'Nothing found',
  endMsg = null,
  topElement,
  bottomElement,
  className,
  columnClassName,
  ...props
}: Props) {
  if (!process.env.PRODUCTION && reverse && columns > 1) {
    throw new Error('Reverse scroller only works with 1 column.');
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [colsReachedEnd, setColsReachedEnd] = useState({
    cols: new Set<number>(),
    numOrigItems: 0,
  });
  const {
    columnItems,
    itemToRow,
    initialVisibleItems,
  } = useItemsToColumns({
    origItems,
    addedItems,
    deletedItems,
    columns,
    addToEnd,
    estimateItemHeight,
  });
  const scrollParentRelative = useCallback((px: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop += px;
    }
  }, []);

  // todo: mid/hard with initialId, scroll to item and handle scrolling in opposite direction
  const initialIdIdx = initialId && origItems.indexOf(initialId);
  if (initialIdIdx && initialIdIdx >= 0) {
    for (let i = 0; i <= initialIdIdx; i++) {
      initialVisibleItems.add(origItems[i]);
    }
  }

  function handleReachedEnd(colIdx: number) {
    setColsReachedEnd(s => {
      if (s.numOrigItems === origItems.length && s.cols.has(colIdx)) {
        return s;
      }

      const newSet = new Set(s.numOrigItems === origItems.length ? s.cols : []);
      newSet.add(colIdx);
      return {
        numOrigItems: origItems.length,
        cols: newSet,
      };
    });

    if (!hasCompleted) {
      setTimeout(() => {
        fetchNext();
      }, 0);
    }
  }

  const numItems = columnItems.reduce((sum, ids) => sum + ids.length, 0);
  if (fetchingFirstTime && !numItems && loadingElement) {
    return (
      <>{loadingElement}</>
    );
  }
  if (fetchingFirstTime || numItems) {
    return (
      <div
        ref={containerRef}
        className={cx({ [styles.reverse]: reverse }, className)}
      >
        {topElement}
        {columns === 1
          ? (
            <div className={styles.singleColumn}>
              <WindowedInfiniteScrollerColumn
                {...props}
                columnIdx={0}
                items={columnItems[0]}
                addedItems={addedItems}
                initialVisibleItems={initialVisibleItems}
                scrollParentRelative={scrollParentRelative}
                itemToRow={itemToRow}
                reverse={reverse}
                hasReachedEnd={hasCompleted && (
                  (colsReachedEnd.numOrigItems === origItems.length && colsReachedEnd.cols.has(0))
                    || columnItems[0].every(item => initialVisibleItems.has(item))
                )}
                onReachEnd={() => handleReachedEnd(0)}
              />
            </div>
          )
          : (
            <div className={styles.columns}>
              {columnItems.map((items, colIdx) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={colIdx}
                  className={cx(styles.column, columnClassName)}
                >
                  <WindowedInfiniteScrollerColumn
                    {...props}
                    columnIdx={colIdx}
                    items={items}
                    addedItems={addedItems}
                    initialVisibleItems={initialVisibleItems}
                    scrollParentRelative={scrollParentRelative}
                    itemToRow={itemToRow}
                    reverse={reverse}
                    hasReachedEnd={hasCompleted && (
                      (colsReachedEnd.numOrigItems === origItems.length
                        && colsReachedEnd.cols.has(colIdx))
                        || items.every(item => initialVisibleItems.has(item))
                    )}
                    onReachEnd={() => handleReachedEnd(colIdx)}
                  />
                </div>
              ))}
            </div>
          )}

        {hasCompleted
          && columnItems.every(
            (items, colIdx) => (colsReachedEnd.numOrigItems === origItems.length
              && colsReachedEnd.cols.has(colIdx))
              || items.every(item => initialVisibleItems.has(item)),
          )
          && endMsg}
        {bottomElement}
      </div>
    );
  }
  if (typeof notFoundMsg === 'string') {
    return (
      <div className={styles.notFoundMsg}>{notFoundMsg}</div>
    );
  }
  return <>{notFoundMsg}</>;
});
