import useLatest from 'utils/useLatest';
import { useHadRouteBeenActive } from 'stores/RouteStore';
import useRefInitialState from 'utils/useRefInitialState';
import isBot from 'utils/isBot';
import ErrorBoundary from 'core/frame/ErrorBoundary';

import styles from './WindowedInfiniteScrollerColumn.scss';

export type Row<ItemType extends string | number> = {
  item: ItemType,
  hasAboveItem: boolean,
  hasBelowItem: boolean,
  setVisible: (visible: boolean) => void,
  setBlock: (block: boolean) => void,
  elem: HTMLDivElement,
  height?: number | null,
};

export type ItemRendererProps<ItemType extends string | number> = {
  item: ItemType,
  aboveItem: ItemType | undefined,
  belowItem: ItemType | undefined,
  itemIdx: number,
  columnIdx: number,
  hasRightColumn: boolean,
};

type ItemProps<
  ItemType extends string | number,
  OtherItemProps extends ObjectOf<any>,
> = {
  item: ItemType,
  aboveItem: ItemType | undefined,
  belowItem: ItemType | undefined,
  itemIdx: number,
  columnIdx: number,
  hasRightColumn: boolean,
  defaultVisible: boolean,
  defaultBlock: boolean,
  isOverflowAnchor: boolean,
  onMount: Stable<(row: Row<ItemType>) => void>,
  onInnerLoad: Stable<(item: ItemType, height: number | null) => void>,
  onUnmount: Stable<(item: ItemType) => void>,
  scrollParentRelative: Stable<(px: number) => void>,
  otherItemProps?: Stable<OtherItemProps>,
  ItemRenderer:
    React.MemoExoticComponent<React.ComponentType<
      ItemRendererProps<ItemType> & OtherItemProps
    >>
    | React.NamedExoticComponent<ItemRendererProps<ItemType> & OtherItemProps>,
};

function WindowedInfiniteScrollerListItem<ItemType extends string | number>({
  item,
  aboveItem,
  belowItem,
  itemIdx,
  columnIdx,
  hasRightColumn,
  ItemRenderer,
  otherItemProps,
  defaultVisible,
  defaultBlock,
  isOverflowAnchor,
  onMount,
  onInnerLoad,
  onUnmount,
  scrollParentRelative,
}: ItemProps<ItemType, any>) {
  const [visible, setVisible] = useState(defaultVisible);
  const [block, setBlock] = useState(defaultBlock);

  const ref = useRefInitialState(() => ({
    height: null as number | null,
    innerRef: null as HTMLDivElement | null,
    outerRef: null as HTMLDivElement | null,
    resizeObserver: new ResizeObserver(entries => {
      const { innerRef, outerRef } = ref.current;
      if (!innerRef || !outerRef) {
        return;
      }

      for (const entry of entries) {
        const { height: prevHeight } = ref.current;
        if (entry.borderBoxSize && prevHeight != null) {
          const contentBoxSize = (Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize) as ResizeObserverSize;
          const newHeight = Math.ceil(contentBoxSize.blockSize);
          if (prevHeight !== newHeight) {
            ref.current.height = newHeight;
            scrollParentRelative(newHeight - prevHeight);
            outerRef.style.height = `${newHeight}px`;
          }
        }
      }
    }),
    rafTimer: null as number | null,
  }));

  const handleOuterLoad = useCallback((outerRef: HTMLDivElement | null) => {
    ref.current.outerRef = outerRef;
    if (outerRef && ref.current.height) {
      outerRef.style.height = `${ref.current.height}px`;
    }
  }, [ref]);

  const handleInnerLoad = useCallback((newInnerRef: HTMLDivElement | null) => {
    ref.current.innerRef = newInnerRef;

    if (ref.current.rafTimer) {
      cancelAnimationFrame(ref.current.rafTimer);
    }

    // getBoundingClientRect causes re-layout
    ref.current.rafTimer = requestAnimationFrame(() => {
      const {
        height: prevHeight,
        outerRef,
        resizeObserver,
        innerRef: prevInnerRef,
      } = ref.current;

      if (newInnerRef) {
        const newHeight = Math.ceil(newInnerRef.getBoundingClientRect().height);
        ref.current.height = newHeight;

        if (outerRef) {
          // Somehow this fixes a scroll anchoring issue.
          outerRef.style.height = `${newHeight}px`;

          if (prevHeight && newHeight && prevHeight !== newHeight) {
            scrollParentRelative(newHeight - prevHeight);
            outerRef.style.height = `${newHeight}px`;
          }

          // Can't set using CSS because initial height is needed
          outerRef.style.contentVisibility = 'auto';
        }

        onInnerLoad(item, newHeight);

        resizeObserver.observe(newInnerRef);
      } else if (prevInnerRef) {
        resizeObserver.unobserve(prevInnerRef);
      }

      ref.current.rafTimer = null;
    });
  }, [ref, item, scrollParentRelative, onInnerLoad]);

  useEffect(() => {
    if (ref.current.outerRef) {
      onMount({
        item,
        hasAboveItem: !!aboveItem,
        hasBelowItem: !!belowItem,
        setVisible,
        setBlock,
        elem: ref.current.outerRef,
        height: ref.current.height,
      });
    }

    return () => {
      onUnmount(item);
    };
  }, [ref, item, aboveItem, belowItem, onMount, onUnmount]);

  return (
    <div
      ref={handleOuterLoad}
      data-item={item}
      className={styles.listItem}
      style={{
        display: visible || block || isBot() ? 'block' : 'none',
        height: ref.current.height ? `${ref.current.height}px` : '1px',
        overflowAnchor: isOverflowAnchor ? 'auto' : undefined,
      }}
    >
      {(visible || isBot()) && (
        <div
          ref={handleInnerLoad}
          className={styles.listItemInner}
        >
          <ErrorBoundary
            Loading={<Spinner dimRem={3} />}
          >
            <ItemRenderer
              item={item}
              aboveItem={aboveItem}
              belowItem={belowItem}
              itemIdx={itemIdx}
              columnIdx={columnIdx}
              hasRightColumn={hasRightColumn}
              {...otherItemProps}
            />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}

const WindowedInfiniteScrollerListItemMemo = React.memo(
  WindowedInfiniteScrollerListItem,
) as typeof WindowedInfiniteScrollerListItem;

export type ColumnProps<
  ItemType extends string | number,
  OtherItemProps extends ObjectOf<any>,
> = {
  reverse?: boolean,
  anchor?: 'first' | 'last' | 'middle',
  columnIdx: number,
  hasRightColumn: boolean,
  items: ItemType[],
  initialVisibleItems: Set<ItemType>,
  itemToRow: Map<ItemType, Row<ItemType>>,
  onReachEnd: Stable<(colIdx: number) => void>,
  scrollableElemRef: React.RefObject<HTMLDivElement> | null,
  scrollParentRelative: Stable<(px: number) => void>,
} & Pick<ItemProps<ItemType, OtherItemProps>, 'ItemRenderer' | 'otherItemProps'>;

export default function WindowedInfiniteScrollerColumn<ItemType extends string | number>({
  reverse,
  anchor = 'middle',
  ItemRenderer,
  otherItemProps,
  columnIdx,
  hasRightColumn,
  items,
  initialVisibleItems,
  itemToRow,
  onReachEnd,
  scrollableElemRef,
  scrollParentRelative,
}: ColumnProps<ItemType, any>) {
  const hadBeenActive = useHadRouteBeenActive(true) ?? true;

  const ref = useRef(useConst(() => ({
    elemToItem: new Map<HTMLDivElement, ItemType>(),
    curVisibleItems: new Set<ItemType>(initialVisibleItems),
    // todo: low/hard maybe split this into separate IntersectionObservers in each item
    observer: null as IntersectionObserver | null,
    overflowAnchorItem: null as ItemType | null,
  })));
  const latestRef = useLatest({
    itemToRow,
    handleIntersection: (entries: IntersectionObserverEntry[]) => {
      const {
        elemToItem,
        curVisibleItems,
        overflowAnchorItem: curAnchorItem,
      } = ref.current;
      const changed = new Set<ItemType>();
      for (const entry of entries) {
        const elem = entry.target as HTMLDivElement;
        const item = elemToItem.get(elem);
        const row = item ? itemToRow.get(item) : null;
        if (!item || !row) {
          continue;
        }

        if ((entry.intersectionRatio > 0 || entry.isIntersecting)
          && !curVisibleItems.has(item)) {
          if ((!reverse && !row.hasBelowItem) || (reverse && !row.hasAboveItem)) {
            onReachEnd(columnIdx);
          }
          curVisibleItems.add(item);
          changed.add(item);
        } else if (entry.intersectionRatio === 0 && !entry.isIntersecting
          && curVisibleItems.has(item)) {
          curVisibleItems.delete(item);
          changed.add(item);
        }
      }

      if (changed.size) {
        // React.startTransition(() => {
        for (const item of changed) {
          const row = itemToRow.get(item);
          if (row && curVisibleItems.has(item)) {
            row.setVisible(true);

            const itemIdx = items.indexOf(item);
            const nextId = items[itemIdx + 1];
            if (nextId) {
              itemToRow.get(nextId)?.setBlock(true);
            }
          } else if (row) {
            row.setVisible(false);
          } else if (!process.env.PRODUCTION) {
            throw new Error('Expected item to exist.');
          }
        }
        // });
      }

      const orderedVisibleItems = items
        .filter(item => curVisibleItems.has(item));
      let anchorIdx: number;
      if (anchor === 'first') {
        anchorIdx = 0;
      } else if (anchor === 'last') {
        anchorIdx = orderedVisibleItems.length - 1;
      } else {
        anchorIdx = Math.ceil(orderedVisibleItems.length / 2) - 1;
      }
      const expectedAnchorItem: ItemType | undefined = orderedVisibleItems[anchorIdx];
      if (expectedAnchorItem !== curAnchorItem) {
        if (curAnchorItem) {
          const overflowAnchorElem = itemToRow
            .get(curAnchorItem)?.elem;
          TS.defined(overflowAnchorElem).style.overflowAnchor = '';
        }
        if (expectedAnchorItem) {
          const centerElem = itemToRow.get(expectedAnchorItem)?.elem;
          TS.defined(centerElem).style.overflowAnchor = 'auto';
        }
        ref.current.overflowAnchorItem = expectedAnchorItem;
      }
    },
  });

  useEffect(() => {
    if (hadBeenActive && !ref.current.observer) {
      ref.current.observer = new IntersectionObserver(entries => {
        latestRef.current.handleIntersection(entries);
      }, {
        root: scrollableElemRef?.current,
        rootMargin: '100% 0px',
      });

      for (const elem of ref.current.elemToItem.keys()) {
        ref.current.observer.observe(elem);
      }
    }

    return () => {
      ref.current.observer?.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ref.current.observer = null;
    };
  }, [hadBeenActive, scrollableElemRef, latestRef]);

  const handleItemMount = useCallback((row: Row<ItemType>) => {
    latestRef.current.itemToRow.set(row.item, row);
    ref.current.elemToItem.set(row.elem, row.item);
    ref.current.observer?.observe(row.elem);
  }, [latestRef]);

  const handleItemInnerLoad = useCallback((
    item: ItemType,
    height: number | null,
  ) => {
    if (!height) {
      return;
    }
    const row = latestRef.current.itemToRow.get(item);
    if (row) {
      row.height = height;
    }
  }, [latestRef]);

  const handleItemUnmount = useCallback((item: ItemType) => {
    const row = latestRef.current.itemToRow.get(item);
    if (row) {
      ref.current.observer?.unobserve(row.elem);
      ref.current.elemToItem.delete(row.elem);
      latestRef.current.itemToRow.delete(row.item);
    }
  }, [latestRef]);

  return items.map((item, idx) => (
    <WindowedInfiniteScrollerListItemMemo
      key={item}
      item={item}
      aboveItem={items[reverse ? idx + 1 : idx - 1]}
      belowItem={items[reverse ? idx - 1 : idx + 1]}
      itemIdx={idx}
      columnIdx={columnIdx}
      hasRightColumn={hasRightColumn}
      defaultVisible={initialVisibleItems.has(item)}
      defaultBlock={
        initialVisibleItems.has(item) || initialVisibleItems.has(items[idx - 1])
      }
      isOverflowAnchor={
        ref.current.overflowAnchorItem === item
          || (!ref.current.curVisibleItems.size && initialVisibleItems.has(item))
      }
      onMount={handleItemMount}
      onInnerLoad={handleItemInnerLoad}
      onUnmount={handleItemUnmount}
      ItemRenderer={ItemRenderer}
      otherItemProps={otherItemProps}
      scrollParentRelative={scrollParentRelative}
    />
  ));
}
