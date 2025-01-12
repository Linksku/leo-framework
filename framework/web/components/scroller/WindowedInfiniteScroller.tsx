import type { PaginatedApiReturn } from 'stores/api/usePaginationApi';
import { useRouteContainerRef, useHadRouteBeenActive } from 'stores/RouteStore';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import usePrevious from 'utils/usePrevious';
import useUpdate from 'utils/useUpdate';
import type { ColumnProps } from './WindowedInfiniteScrollerColumn';
import WindowedInfiniteScrollerColumn from './WindowedInfiniteScrollerColumn';
import ScrollerSpinner from './ScrollerSpinner';
import useItemsToColumns from './useItemsToColumns';

import styles from './WindowedInfiniteScroller.scss';

export type InnerProps<ItemType extends string | number> = {
  origItems: Stable<ItemType[]>,
}
  & Pick<PaginatedApiReturn, 'isFirstFetch' | 'hasCompleted' | 'error' | 'fetchNext'>;

export type ScrollerProps<
  ItemType extends string | number,
  OtherProps extends ObjectOf<any>,
> = {
  addedItems?: Stable<ItemType[]>,
  deletedItems?: Stable<Set<ItemType>>,
  initialId?: ItemType,
  addEntitiesToEnd?: boolean,
  columns?: number,
  estimateItemHeight?: Stable<(item: ItemType, avgHeight: number) => number>,
  notFoundMsg?: Stable<ReactNode>,
  completedMsg?: Stable<ReactNode>,
  topElement?: Stable<ReactElement>,
  bottomElement?: Stable<ReactElement>,
  scrollableParentRef?: React.RefObject<HTMLDivElement> | null,
  className?: string,
  columnClassName?: string,
  errorClassName?: string,
  notFoundClassName?: string,
  spinnerPadding?: string,
  spinnerDimRem?: number,
  spinnerWrapClassName?: string,
  colSpinnerWrapClassName?: string,
}
  & InnerProps<ItemType>
  & Pick<
    ColumnProps<ItemType, OtherProps>,
    'reverse' | 'anchor' | 'ItemRenderer' | 'otherItemProps'
  >;

// eslint-disable-next-line local-rules/react-max-hooks-per-component
export default React.memo(function WindowedInfiniteScroller<
  ItemType extends string | number,
>({
  origItems,
  addedItems,
  deletedItems,
  isFirstFetch,
  hasCompleted,
  error: apiError,
  fetchNext,
  reverse = false,
  addEntitiesToEnd = false,
  initialId,
  columns = 1,
  estimateItemHeight,
  notFoundMsg = 'Nothing found',
  completedMsg = null,
  topElement,
  bottomElement,
  scrollableParentRef,
  className,
  columnClassName,
  errorClassName,
  notFoundClassName,
  spinnerPadding,
  spinnerDimRem,
  spinnerWrapClassName,
  colSpinnerWrapClassName,
  ...props
}: ScrollerProps<ItemType, any>) {
  if (!process.env.PRODUCTION && reverse && columns > 1) {
    throw new Error('Reverse scroller only works with 1 column.');
  }

  const hadBeenActive = useHadRouteBeenActive(true) ?? true;
  const routeContainerRef = useRouteContainerRef(true);
  const scrollableElemRef = scrollableParentRef ?? routeContainerRef ?? null;

  const forceUpdate = useUpdate();
  const hasRouteContainer = !!routeContainerRef?.current;
  useEffect(() => {
    // Render -> no routeContainer -> ref sets routeContainer -> effect -> force update
    if (!hasRouteContainer && routeContainerRef?.current) {
      forceUpdate();
    }
  }, [hasRouteContainer, routeContainerRef, forceUpdate]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const {
    columnItems: _columnItems,
    itemToRow,
    initialVisibleItems,
  } = useItemsToColumns({
    origItems,
    addedItems,
    deletedItems,
    columns,
    estimateItemHeight,
  });
  const columnItemsSets = _columnItems;
  const columnItems = useMemo(() => {
    const allItems = addEntitiesToEnd
      ? [...origItems, ...(addedItems ?? [])]
      : [...(addedItems ?? []), ...origItems];
    return columnItemsSets.map(set => allItems.filter(item => set.has(item)));
  }, [addedItems, addEntitiesToEnd, origItems, columnItemsSets]);

  const scrollParentRelative = useCallback((px: number) => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop += px;
    }
  }, []);

  if (initialId) {
  // todo: mid/hard with initialId, scroll to item and handle scrolling in opposite direction
    const initialIdIdx = origItems.indexOf(initialId);
    if (initialIdIdx >= 0) {
      for (let i = 0; i <= initialIdIdx; i++) {
        initialVisibleItems.add(origItems[i]);
      }
    }
  }

  const [colsReachedEnd, setColsReachedEnd] = useState({
    cols: [] as number[],
    lastOrigItem: null as string | number | null,
  });
  const lastOrigItem = origItems.at(-1) ?? null;
  const handleReachEnd = useLatestCallback((colIdx: number) => {
    setColsReachedEnd(s => {
      if (s.lastOrigItem === lastOrigItem) {
        if (s.cols.includes(colIdx)) {
          return s;
        }
        return {
          lastOrigItem,
          cols: [...s.cols, colIdx],
        };
      }

      const newCols = [
        ...(s.lastOrigItem === lastOrigItem ? s.cols : []),
        colIdx,
      ];
      return {
        lastOrigItem,
        cols: newCols,
      };
    });

    fetchNext();
  });
  const hasColsReachedEnd = useMemo(
    () => columnItems.map(
      (items, colIdx) => (colsReachedEnd.lastOrigItem === lastOrigItem
        && colsReachedEnd.cols.includes(colIdx))
          || items.every(item => initialVisibleItems.has(item))),
    [colsReachedEnd, columnItems, initialVisibleItems, lastOrigItem],
  );

  const onSpinnerVisible = useLatestCallback(() => {
    if (scrollableElemRef?.current) {
      // Stop momentum scroll
      scrollableElemRef.current.style.setProperty('overflow', 'hidden');
      scrollableElemRef.current.style.removeProperty('overflow');
    }
  });

  const numItems = columnItems.reduce((sum, ids) => sum + ids.length, 0);
  const [stuckSpinnerNumItems, setStuckSpinnerNumItems] = useState(-1);
  const onSpinnerTimeout = useLatestCallback(() => {
    setStuckSpinnerNumItems(numItems);
  });

  const prevHasCompleted = usePrevious(hasCompleted);
  useEffect(() => {
    if (prevHasCompleted === true && hasCompleted === false) {
      setStuckSpinnerNumItems(-1);
      fetchNext();
    }
  }, [hasCompleted, prevHasCompleted, fetchNext]);

  if (routeContainerRef?.current === null) {
    // Waiting for useEffect to set routeContainer
    return 'Loading';
  }
  if (isFirstFetch || numItems || apiError) {
    return (
      <div
        ref={scrollerRef}
        className={cx({ [styles.reverse]: reverse }, className)}
      >
        {topElement}
        {columns === 1 || (isFirstFetch && !numItems)
          ? (
            <div className={cx(styles.singleColumn, columnClassName)}>
              {columnItems[0].length > 0 && (
                <WindowedInfiniteScrollerColumn
                  {...props}
                  columnIdx={0}
                  hasRightColumn={false}
                  items={columnItems[0]}
                  initialVisibleItems={initialVisibleItems}
                  scrollParentRelative={scrollParentRelative}
                  itemToRow={itemToRow}
                  reverse={reverse}
                  onReachEnd={handleReachEnd}
                  scrollableElemRef={scrollableElemRef}
                />
              )}
              {apiError
                || (stuckSpinnerNumItems === numItems && hadBeenActive)
                || (hasCompleted && hasColsReachedEnd[0])
                ? null
                : (
                  <ScrollerSpinner
                    numItems={numItems}
                    spinnerPadding={spinnerPadding}
                    spinnerDimRem={spinnerDimRem}
                    spinnerWrapClassName={spinnerWrapClassName}
                    onSpinnerVisible={hadBeenActive ? onSpinnerVisible : undefined}
                    onSpinnerTimeout={hadBeenActive ? onSpinnerTimeout : undefined}
                  />
                )}
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
                  {items.length > 0 && (
                    <WindowedInfiniteScrollerColumn
                      {...props}
                      columnIdx={colIdx}
                      hasRightColumn={colIdx < columns - 1}
                      items={items}
                      initialVisibleItems={initialVisibleItems}
                      scrollParentRelative={scrollParentRelative}
                      itemToRow={itemToRow}
                      reverse={reverse}
                      onReachEnd={handleReachEnd}
                      scrollableElemRef={scrollableElemRef}
                    />
                  )}
                  {apiError
                    || (stuckSpinnerNumItems === numItems && hadBeenActive)
                    || (hasCompleted && hasColsReachedEnd[colIdx])
                    ? null
                    : (
                      <ScrollerSpinner
                        numItems={numItems}
                        spinnerPadding={spinnerPadding}
                        spinnerDimRem={spinnerDimRem}
                        spinnerWrapClassName={colSpinnerWrapClassName}
                        onSpinnerVisible={hadBeenActive ? onSpinnerVisible : undefined}
                        onSpinnerTimeout={hadBeenActive ? onSpinnerTimeout : undefined}
                      />
                    )}
                </div>
              ))}
            </div>
          )}

        {(() => {
          if (apiError || (stuckSpinnerNumItems === numItems && hadBeenActive)) {
            return (
              <div className={cx(styles.errorWrap, errorClassName)}>
                <p className={styles.errorMsg}>
                  {apiError?.message ?? 'Unknown error occurred'}
                </p>
                <Button
                  label="Retry"
                  fullWidth
                  onClick={() => {
                    setStuckSpinnerNumItems(-1);
                    fetchNext();
                  }}
                />
              </div>
            );
          }
          if (hasCompleted
            && columnItems.every((_, colIdx) => hasColsReachedEnd[colIdx])
            && completedMsg) {
            return React.isValidElement(completedMsg)
              ? (
                <ErrorBoundary>
                  {completedMsg}
                </ErrorBoundary>
              )
              : completedMsg;
          }
          return null;
        })()}
        {bottomElement}
      </div>
    );
  }

  if (notFoundMsg === null) {
    return null;
  }
  if (React.isValidElement(notFoundMsg)) {
    return (
      <ErrorBoundary>
        {notFoundMsg}
      </ErrorBoundary>
    );
  }
  return (
    <div
      className={cx(styles.notFoundMsg, notFoundClassName)}
    >
      {notFoundMsg}
    </div>
  );
});
