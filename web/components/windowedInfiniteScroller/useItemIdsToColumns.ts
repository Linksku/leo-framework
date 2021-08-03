import usePrevious from 'react-use/lib/usePrevious';

import useUpdatedState from 'lib/hooks/useUpdatedState';

import type { Item } from './WindowedInfiniteScrollerColumn';

const sumArr = (arr: number[]) => arr.reduce((sum, num) => sum + num, 0);

export default function useItemIdsToColumns(
  origItemIds: number[],
  addedItemIds: number[],
  deletedItemIds: Set<number>,
  columns: number,
) {
  const prevAddedItemsCount = usePrevious(addedItemIds.length) ?? 0;
  const prevDeletedItemsCount = usePrevious(deletedItemIds.size) ?? 0;
  const prevOrigItemsCount = usePrevious(origItemIds.length) ?? 0;
  return useUpdatedState(() => ({
    columnItemIds: Array.from({ length: columns }, _ => [] as number[]),
    idToItem: new Map() as Map<number, Item>,
    initialVisibleIds: new Set<number>(),
  }), s => {
    const columnItemIds = s.columnItemIds.map(ids => [...ids]);
    const idToItem = new Map(s.idToItem);
    const initialVisibleIds = new Set(s.initialVisibleIds);

    // Add addedItemIds to columnItemIds.
    if (addedItemIds.length > prevAddedItemsCount) {
      for (let i = prevAddedItemsCount; i < addedItemIds.length; i++) {
        columnItemIds[0].unshift(addedItemIds[i]);
        initialVisibleIds.add(addedItemIds[i]);
      }
      // todo: mid/easy add assert function
    } else if (process.env.NODE_ENV !== 'production' && addedItemIds.length < prevAddedItemsCount) {
      throw new Error('useItemIdsToColumns: added items decreased.');
    }

    // Remove deletedItemIds from columnItemIds.
    if (deletedItemIds.size > prevDeletedItemsCount) {
      for (let col = 0; col < columns; col++) {
        columnItemIds[col] = columnItemIds[col].filter(id => !deletedItemIds.has(id));
      }
    } else if (process.env.NODE_ENV !== 'production' && deletedItemIds.size < prevDeletedItemsCount) {
      throw new Error('useItemIdsToColumns: delete items decreased.');
    }

    // Add itemIds to columnItemIds.
    if (!prevOrigItemsCount && origItemIds.length) {
    // First render with items. Distribute across columns evenly.
      for (let row = 0; row < origItemIds.length; row += columns) {
        for (let col = 0; col < columns; col++) {
          if (row + col < origItemIds.length) {
            if (row === 0) {
              initialVisibleIds.add(origItemIds[row + col]);
            }

            columnItemIds[col].push(origItemIds[row + col]);
          }
        }
      }
    } else if (prevOrigItemsCount && origItemIds.length > prevOrigItemsCount) {
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
      for (let i = prevOrigItemsCount; i < origItemIds.length;) {
        for (let col = 0; col < columns; col++) {
          if (columnHeights[col] < maxHeight || colsWithMaxHeight === columns) {
            columnItemIds[col].push(origItemIds[i]);
            if (!columnsWithNew.has(col) || !maxHeightChanged) {
              columnsWithNew.add(col);
              initialVisibleIds.add(origItemIds[i]);
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

            if (i === origItemIds.length) {
              break;
            }
          }
        }
      }
    } else if (process.env.NODE_ENV !== 'production' && origItemIds.length < prevOrigItemsCount) {
      throw new Error('useItemIdsToColumns: items decreased.');
    }

    return {
      columnItemIds,
      idToItem,
      initialVisibleIds,
    };
  });
}
