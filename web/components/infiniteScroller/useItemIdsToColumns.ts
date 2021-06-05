import usePrevious from 'lib/hooks/usePrevious';

import type { Item } from './InfiniteScrollerColumn';

const sumArr = (arr: number[]) => arr.reduce((sum, num) => sum + num, 0);

export default function useItemIdsToColumns(
  itemIds: number[],
  addedItemIds: number[],
  deletedItemIds: number[],
  columns: number,
) {
  const ref = useRef(useMemo(() => ({
    columnItemIds: Array.from({ length: columns }, _ => [] as number[]),
    idToItem: new Map() as Map<number, Item>,
    initialVisibleIds: new Set<number>(),
  }), [columns]));
  const { columnItemIds, idToItem, initialVisibleIds } = ref.current;

  // Add addedItemIds to columnItemIds.
  const prevAddedItemsCount = usePrevious(addedItemIds.length) ?? 0;
  if (addedItemIds.length > prevAddedItemsCount) {
    for (let i = prevAddedItemsCount; i < addedItemIds.length; i++) {
      columnItemIds[0].unshift(addedItemIds[i]);
      initialVisibleIds.add(addedItemIds[i]);
    }
  } else if (process.env.NODE_ENV !== 'production' && addedItemIds.length < prevAddedItemsCount) {
    throw new Error('InfiniteScroller added items decreased.');
  }

  // Remove deletedItemIds from columnItemIds.
  const prevDeletedItemsCount = usePrevious(deletedItemIds.length) ?? 0;
  if (deletedItemIds.length > prevDeletedItemsCount) {
    for (let i = prevDeletedItemsCount; i < deletedItemIds.length; i++) {
      for (let col = 0; col < columns; col++) {
        columnItemIds[col] = columnItemIds[col].filter(
          id => id !== deletedItemIds[i],
        );
      }
    }
  } else if (process.env.NODE_ENV !== 'production' && deletedItemIds.length < prevDeletedItemsCount) {
    throw new Error('InfiniteScroller delete items decreased.');
  }

  // Add itemIds to columnItemIds.
  const prevItemsCount = usePrevious(itemIds.length) ?? 0;
  if (!prevItemsCount && itemIds.length) {
    // First render with items. Distribute across columns evenly.
    for (let row = 0; row < itemIds.length; row += columns) {
      for (let col = 0; col < columns; col++) {
        if (row + col < itemIds.length) {
          if (row === 0) {
            initialVisibleIds.add(itemIds[row + col]);
          }

          columnItemIds[col].push(itemIds[row + col]);
        }
      }
    }
  } else if (prevItemsCount && itemIds.length > prevItemsCount) {
    // New items were loaded. Try to make heights even.
    const columnHeights = columnItemIds
      .map(
        ids => sumArr(ids.map(id => idToItem.get(id)?.height ?? 0)),
      );
    let avgHeight = sumArr(columnHeights)
      / sumArr(
        columnItemIds
          .map(ids => ids.filter(id => idToItem.get(id)?.height).length),
      );
    if (!avgHeight) {
      avgHeight = 100;
    }

    const columnsWithNew = new Set<number>();
    let maxHeight = Math.max(...columnHeights);
    let colsWithMaxHeight = columnHeights.filter(h => h === maxHeight).length;
    // Needed for when 1 column is over a screen taller than another column,
    // so intersectionobserver never triggers.
    let maxHeightChanged = false;
    for (let i = prevItemsCount; i < itemIds.length;) {
      for (let col = 0; col < columns; col++) {
        if (columnHeights[col] < maxHeight || colsWithMaxHeight === columns) {
          columnItemIds[col].push(itemIds[i]);
          if (!columnsWithNew.has(col) || !maxHeightChanged) {
            columnsWithNew.add(col);
            initialVisibleIds.add(itemIds[i]);
          }

          columnHeights[col] += avgHeight;
          if (columnHeights[col] === maxHeight) {
            colsWithMaxHeight += 1;
          } else if (columnHeights[col] > maxHeight) {
            maxHeight = columnHeights[col];
            maxHeightChanged = true;
            colsWithMaxHeight = 1;
          }
          i++;

          if (i === itemIds.length) {
            break;
          }
        }
      }
    }
  } else if (process.env.NODE_ENV !== 'production' && itemIds.length < prevItemsCount) {
    throw new Error('InfiniteScroller items decreased.');
  }

  return {
    columnItemIds,
    idToItem,
    initialVisibleIds,
  };
}
