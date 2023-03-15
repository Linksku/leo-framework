import usePrevious from 'utils/hooks/usePrevious';

import useUpdatedState from 'utils/hooks/useUpdatedState';

import type { Row } from './WindowedInfiniteScrollerColumn';

const sumArr = (arr: number[]) => arr.reduce((sum, num) => sum + num, 0);

export default function useItemsToColumns({
  origItems,
  addedItems,
  deletedItems,
  columns,
  addToEnd,
  estimateItemHeight,
}: {
  origItems: (string | number)[],
  addedItems?: (string | number)[],
  deletedItems?: Set<string | number>,
  columns: number,
  addToEnd?: boolean,
  estimateItemHeight?: (item: string | number, avgHeight: number) => number,
}) {
  const prevAddedItemsCount = usePrevious(addedItems?.length) ?? 0;
  const prevDeletedItemsCount = usePrevious(deletedItems?.size) ?? 0;
  const prevOrigItemsCount = usePrevious(origItems.length) ?? 0;
  if (!process.env.PRODUCTION) {
    if (origItems.length < prevOrigItemsCount) {
      throw new Error('useItemsToColumns: items decreased.');
    }

    if (addedItems && addedItems.length < prevAddedItemsCount) {
      throw new Error('useItemsToColumns: added items decreased.');
    }

    if (deletedItems && deletedItems.size < prevDeletedItemsCount) {
      throw new Error('useItemsToColumns: delete items decreased.');
    }
  }

  return useUpdatedState(() => ({
    columnItems: Array.from({ length: columns }, _ => [] as (string | number)[]),
    itemToRow: new Map() as Map<string | number, Row>,
    initialVisibleItems: new Set<string | number>(),
  }), s => {
    if (prevAddedItemsCount === (addedItems?.length ?? 0)
      && prevDeletedItemsCount === (deletedItems?.size ?? 0)
      && prevOrigItemsCount === origItems.length) {
      return s;
    }

    const columnItems = s.columnItems.map(items => [...items]);
    let { itemToRow, initialVisibleItems } = s;

    const initialItems = [
      ...origItems,
      ...(addedItems ?? []),
    ].filter(item => !deletedItems?.has(item));
    if (!prevOrigItemsCount && initialItems.length) {
      initialVisibleItems = new Set(initialVisibleItems);
      for (let i = 0; i < columns && i < initialItems.length; i++) {
        initialVisibleItems.add(initialItems[i]);
      }
    }

    const addedItemsSet = new Set(addedItems);
    const newItems = [
      ...origItems.slice(prevOrigItemsCount)
        .filter(item => !addedItemsSet.has(item)),
      ...(addedItems?.slice(prevAddedItemsCount) ?? []),
    ].filter(item => !deletedItems?.has(item));
    if (newItems.length) {
      const columnHeights = columnItems
        .map(
          items => sumArr(items.map(item => itemToRow.get(item)?.height ?? 0)),
        );
      let avgHeight = sumArr(columnHeights)
      / sumArr(
        columnItems
          .map(items => items.filter(item => itemToRow.get(item)?.height).length),
      );
      if (!avgHeight || Number.isNaN(avgHeight)) {
        avgHeight = 200;
      }

      const columnsWithNew = new Set<number>();
      let maxHeight = Math.max(...columnHeights);
      let colsWithMaxHeight = columnHeights.filter(h => h === maxHeight).length;
      // Needed for when 1 column is over a screen taller than another column,
      // so intersectionobserver never triggers.
      let maxHeightChanged = false;
      let col = 0;
      for (const item of newItems) {
        const isAddedItem = addedItemsSet?.has(item);
        for (; col < columns; col = (col + 1) % columns) {
          if (columnHeights[col] < maxHeight || colsWithMaxHeight === columns) {
            if (isAddedItem && !addToEnd) {
              columnItems[col].unshift(item);
            } else {
              columnItems[col].push(item);
            }

            if (!columnsWithNew.has(col) || !maxHeightChanged) {
              columnsWithNew.add(col);
              initialVisibleItems.add(item);
            } else if (isAddedItem) {
              initialVisibleItems.add(item);
            }

            columnHeights[col] += estimateItemHeight
              ? estimateItemHeight(item, avgHeight)
              : avgHeight;
            if (columnHeights[col] === maxHeight) {
              colsWithMaxHeight += 1;
            } else if (columnHeights[col] > maxHeight) {
              maxHeight = columnHeights[col];
              maxHeightChanged = true;
              colsWithMaxHeight = 1;
            }
            break;
          }
        }
      }
    }

    if (deletedItems && deletedItems.size > prevDeletedItemsCount) {
      for (let col = 0; col < columns; col++) {
        columnItems[col] = columnItems[col].filter(item => !deletedItems.has(item));
      }
    }

    return {
      columnItems,
      itemToRow,
      initialVisibleItems,
    };
  });
}
