import usePrevious from 'hooks/usePrevious';

import useUpdatedState from 'hooks/useUpdatedState';

import type { Row } from './WindowedInfiniteScrollerColumn';

const sumArr = (arr: number[]) => arr.reduce((sum, num) => sum + num, 0);

export default function useItemsToColumns<ItemType extends string | number>({
  origItems,
  addedItems,
  deletedItems,
  columns,
  estimateItemHeight,
}: {
  origItems: ItemType[],
  addedItems?: ItemType[],
  deletedItems?: Set<ItemType>,
  columns: number,
  estimateItemHeight?: (item: ItemType, avgHeight: number) => number,
}): {
  columnItems: Stable<Set<ItemType>[]>,
  itemToRow: Map<ItemType, Row<ItemType>>,
  initialVisibleItems: Stable<Set<ItemType>>,
} {
  const prevAddedItems = usePrevious(addedItems) ?? [];
  const prevOrigItems = usePrevious(origItems) ?? [];
  const prevDeletedItems = usePrevious(deletedItems) ?? new Set();

  return useUpdatedState(() => ({
    columnItems: markStable(Array.from({ length: columns }, _ => new Set<ItemType>())),
    itemToRow: new Map<ItemType, Row<ItemType>>(),
    initialVisibleItems: markStable(new Set<ItemType>()),
  }), s => {
    if (prevAddedItems.length === (addedItems?.length ?? 0)
      && prevOrigItems.length === origItems.length) {
      return s;
    }

    const columnItems = markStable(s.columnItems.map(items => new Set(items)));
    const initialVisibleItems = markStable(new Set(s.initialVisibleItems));

    if (!prevOrigItems.length && (origItems.length || addedItems?.length)) {
      const initialItems = [
        ...origItems,
        ...(addedItems ?? []),
      ];
      for (let i = 0; i < columns && i < initialItems.length; i++) {
        initialVisibleItems.add(initialItems[i]);
      }
    }

    const newAddedItems = (addedItems?.filter(
      item => !prevAddedItems.includes(item) && !deletedItems?.has(item),
    ) ?? []);
    if (newAddedItems.length) {
      for (const item of newAddedItems) {
        initialVisibleItems.add(item);
      }
    }

    const prevOrigItemsSet = new Set(prevOrigItems);
    const origItemsSet = new Set(origItems);

    const deletedOrigItems = prevOrigItems.filter(item => !origItemsSet.has(item));
    const newDeletedItems = [...deletedItems ?? []].filter(item => !prevDeletedItems.has(item));
    for (const item of [...deletedOrigItems, ...newDeletedItems]) {
      for (const colItems of columnItems) {
        colItems.delete(item);
      }
    }

    const newOrigItems = origItems.filter(item => !prevOrigItemsSet.has(item));
    for (const item of prevOrigItems) {
      initialVisibleItems.add(item);
    }
    const newItems = [
      ...newOrigItems,
      ...newAddedItems,
    ];
    if (newItems.length) {
      if (columns === 1) {
        initialVisibleItems.add(newItems[0]);
        for (const item of newItems) {
          columnItems[0].add(item);
        }
      } else {
        const columnHeights = columnItems.map(
          items => sumArr([...items].map(item => s.itemToRow.get(item)?.height ?? 0)),
        );
        let avgHeight = sumArr(columnHeights)
          / sumArr(columnItems.map(
            items => [...items].filter(item => s.itemToRow.get(item)?.height).length,
          ));
        if (!avgHeight || Number.isNaN(avgHeight)) {
          avgHeight = 200;
        }

        const columnsWithNew = new Set<number>();
        const initialMaxHeight = Math.max(...columnHeights);
        // Needed for when 1 column is over a screen taller than another column,
        // so intersectionobserver never triggers.
        let maxHeightChanged = false;
        for (const item of newItems) {
          const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));
          columnItems[shortestCol].add(item);

          if (!columnsWithNew.has(shortestCol) || !maxHeightChanged) {
            columnsWithNew.add(shortestCol);
            initialVisibleItems.add(item);
          }

          columnHeights[shortestCol] += estimateItemHeight
            ? estimateItemHeight(item, avgHeight)
            : avgHeight;
          if (!maxHeightChanged && columnHeights[shortestCol] > initialMaxHeight) {
            maxHeightChanged = true;
          }
        }
      }
    }

    return {
      columnItems,
      itemToRow: s.itemToRow,
      initialVisibleItems,
    };
  });
}
