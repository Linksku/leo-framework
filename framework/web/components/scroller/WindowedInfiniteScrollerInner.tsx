import { API_TIMEOUT } from 'settings';
import useVisibilityObserver from 'hooks/useVisibilityObserver';
import { useInnerContainerRef, useHadRouteBeenActive } from 'stores/RouteStore';
import type { ListItemRendererProps } from './WindowedInfiniteScrollerColumn';
import WindowedInfiniteScrollerColumn from './WindowedInfiniteScrollerColumn';
import useItemsToColumns from './useItemsToColumns';

import styles from './WindowedInfiniteScrollerInnerStyles.scss';

function InnerSpinner({
  numItems,
  spinnerPadding,
  spinnerDimRem,
  onSpinnerVisible,
  onSpinnerTimeout,
}: {
  numItems: number,
  spinnerPadding?: string,
  spinnerDimRem?: number,
  onSpinnerVisible?: Stable<() => void>,
  onSpinnerTimeout?: Stable<() => void>,
}) {
  const timerRef = useRef<number | null>(null);
  const visibilityRef = useVisibilityObserver({
    onVisible: useCallback(() => {
      onSpinnerVisible?.();
      if (onSpinnerTimeout) {
        timerRef.current = window.setTimeout(onSpinnerTimeout, API_TIMEOUT / 2);
      }
    }, [onSpinnerVisible, onSpinnerTimeout]),
    onHidden: useCallback(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }, []),
  });

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [numItems]);

  return (
    <div
      key={numItems}
      ref={visibilityRef}
      className={styles.spinner}
      style={{
        padding: spinnerPadding ? `${spinnerPadding} 0` : undefined,
      }}
    >
      <Spinner
        dimRem={spinnerDimRem}
      />
    </div>
  );
}

export type Props<ItemType extends string | number> = {
  origItems: Stable<ItemType[]>,
  addedItems?: Stable<ItemType[]>,
  deletedItems?: Stable<Set<ItemType>>,
  isFirstFetch?: boolean,
  hasCompleted: boolean,
  apiError: Error | null,
  fetchNext: Stable<() => void>,
  reverse?: boolean,
  addEntitiesToEnd?: boolean,
  initialId?: ItemType,
  columns?: number,
  loadingElement?: Stable<ReactElement>,
  estimateItemHeight?: Stable<(item: ItemType, avgHeight: number) => number>,
  notFoundMsg?: Stable<ReactNode>,
  completedMsg?: Stable<ReactNode>,
  topElement?: Stable<ReactElement>,
  bottomElement?: Stable<ReactElement>,
  scrollableParentRef?: React.RefObject<HTMLDivElement>,
  className?: string,
  columnClassName?: string,
  errorClassName?: string,
  spinnerPadding?: string,
  spinnerDimRem?: number,
} & ListItemRendererProps<ItemType>;

// Note: items are append-only.
export default React.memo(function WindowedInfiniteScrollerInner<ItemType extends string | number>({
  origItems,
  addedItems,
  deletedItems,
  isFirstFetch,
  hasCompleted,
  apiError,
  fetchNext,
  reverse = false,
  addEntitiesToEnd = false,
  initialId,
  columns = 1,
  loadingElement,
  estimateItemHeight,
  notFoundMsg = 'Nothing found',
  completedMsg = null,
  topElement,
  bottomElement,
  scrollableParentRef,
  className,
  columnClassName,
  errorClassName,
  spinnerPadding,
  spinnerDimRem,
  ...props
}: Props<ItemType>) {
  if (!process.env.PRODUCTION && reverse && columns > 1) {
    throw new Error('Reverse scroller only works with 1 column.');
  }

  let hadBeenActive = true;
  let innerContainerRef: React.RefObject<HTMLDivElement & __STABLE> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hadBeenActive = useHadRouteBeenActive();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    innerContainerRef = useInnerContainerRef();
  } catch {}
  const scrollableRef = scrollableParentRef ?? innerContainerRef ?? null;

  const innerRef = useRef<HTMLDivElement>(null);
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
  const columnItemsSets = _columnItems as Stable<Set<string | number>[]>;
  const columnItems = useMemo(() => {
    const allItems = addEntitiesToEnd
      ? [...origItems, ...(addedItems ?? [])]
      : [...(addedItems ?? []), ...origItems];
    return columnItemsSets.map(set => allItems.filter(item => set.has(item)));
  }, [addedItems, addEntitiesToEnd, origItems, columnItemsSets]);

  const scrollParentRelative = useCallback((px: number) => {
    if (innerRef.current) {
      innerRef.current.scrollTop += px;
    }
  }, []);

  // todo: mid/hard with initialId, scroll to item and handle scrolling in opposite direction
  const initialIdIdx = initialId && origItems.indexOf(initialId);
  if (initialIdIdx && initialIdIdx >= 0) {
    for (let i = 0; i <= initialIdIdx; i++) {
      initialVisibleItems.add(origItems[i]);
    }
  }

  const [colsReachedEnd, setColsReachedEnd] = useState({
    cols: [] as number[],
    lastOrigItem: null as string | number | null,
  });
  const lastOrigItem = TS.last(origItems) ?? null;
  const handleReachedEnd = useCallback((colIdx: number) => {
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
  }, [fetchNext, lastOrigItem]);
  const hasColsReachedEnd = useMemo(
    () => columnItems.map(
      (items, colIdx) => (colsReachedEnd.lastOrigItem === lastOrigItem
        && colsReachedEnd.cols.includes(colIdx))
          || items.every(item => initialVisibleItems.has(item))),
    [colsReachedEnd, columnItems, initialVisibleItems, lastOrigItem],
  );

  const onSpinnerVisible = useCallback(() => {
    if (scrollableRef?.current) {
      scrollableRef.current.style.setProperty('overflow', 'hidden');
      scrollableRef.current.style.removeProperty('overflow');
    }
  }, [scrollableRef]);

  const numItems = columnItems.reduce((sum, ids) => sum + ids.length, 0);
  const [stuckSpinnerNumItems, setStuckSpinnerNumItems] = useState(-1);
  const onSpinnerTimeout = useCallback(() => {
    setStuckSpinnerNumItems(numItems);
  }, [numItems]);

  if (isFirstFetch && !numItems && loadingElement) {
    return loadingElement;
  }
  if (isFirstFetch || numItems || apiError) {
    // todo: low/mid resizing window may make spinner stuck
    return (
      <div
        ref={innerRef}
        className={cx({ [styles.reverse]: reverse }, className)}
      >
        {topElement}
        {columns === 1
          ? (
            <div className={cx(styles.singleColumn, columnClassName)}>
              <WindowedInfiniteScrollerColumn
                {...props}
                columnIdx={0}
                hasRightColumn={false}
                items={columnItems[0]}
                initialVisibleItems={initialVisibleItems}
                scrollParentRelative={scrollParentRelative}
                itemToRow={itemToRow}
                reverse={reverse}
                onReachEnd={handleReachedEnd}
                scrollableRef={scrollableRef}
              />
              {apiError
                || (stuckSpinnerNumItems === numItems && hadBeenActive)
                || (hasCompleted && hasColsReachedEnd[0])
                ? null
                : (
                  <InnerSpinner
                    numItems={numItems}
                    spinnerPadding={spinnerPadding}
                    spinnerDimRem={spinnerDimRem}
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
                  <WindowedInfiniteScrollerColumn
                    {...props}
                    columnIdx={colIdx}
                    hasRightColumn={colIdx < columns - 1}
                    items={items}
                    initialVisibleItems={initialVisibleItems}
                    scrollParentRelative={scrollParentRelative}
                    itemToRow={itemToRow}
                    reverse={reverse}
                    onReachEnd={handleReachedEnd}
                    scrollableRef={scrollableRef}
                  />
                  {apiError
                    || (stuckSpinnerNumItems === numItems && hadBeenActive)
                    || (hasCompleted && hasColsReachedEnd[colIdx])
                    ? null
                    : (
                      <InnerSpinner
                        numItems={numItems}
                        spinnerPadding={spinnerPadding}
                        spinnerDimRem={spinnerDimRem}
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
            return completedMsg;
          }
          return null;
        })()}
        {bottomElement}
      </div>
    );
  }
  if (typeof notFoundMsg === 'string') {
    return (
      <div className={styles.notFoundMsg}>{notFoundMsg}</div>
    );
  }
  return notFoundMsg;
});
