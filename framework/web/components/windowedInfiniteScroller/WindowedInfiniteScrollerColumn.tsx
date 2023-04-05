import useLatest from 'hooks/useLatest';
import { useInnerContainerRef, useGetIsRouteActive } from 'stores/RouteStore';

import styles from './WindowedInfiniteScrollerColumnStyles.scss';

export type Row = {
  item: string | number,
  hasAboveItem: boolean,
  hasBelowItem: boolean,
  setVisible: (visible: boolean) => void,
  setBlock: (block: boolean) => void,
  elem: HTMLDivElement,
  height?: number | null,
};

export type ItemProps = {
  item: string | number,
  aboveItem: string | number | undefined,
  belowItem: string | number | undefined,
  columnIdx: number,
  hasRightColumn: boolean,
};

export type ListItemRendererProps<
  // eslint-disable-next-line @typescript-eslint/ban-types
  OtherProps extends ObjectOf<any> = {},
> = {
  otherItemProps?: Memoed<OtherProps>,
  ItemRenderer:
    React.MemoExoticComponent<React.ComponentType<ItemProps & OtherProps>>
    | React.NamedExoticComponent<ItemProps & OtherProps>,
};

type ListItemProps = {
  item: string | number,
  aboveItem: string | number | undefined,
  belowItem: string | number | undefined,
  columnIdx: number,
  hasRightColumn: boolean,
  defaultVisible: boolean,
  defaultBlock: boolean,
  isOverflowAnchor: boolean,
  onMount: Memoed<(params: Row) => void>,
  onInnerLoad: Memoed<(item: string | number, elem: HTMLDivElement, height: number | null) => void>,
  onUnmount: Memoed<(item: string | number) => void>,
  scrollParentRelative: Memoed<(px: number) => void>,
} & ListItemRendererProps;

const WindowedInfiniteScrollerListItem = React.memo(function WindowedInfiniteScrollerListItem({
  item,
  aboveItem,
  belowItem,
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
}: ListItemProps) {
  const [visible, setVisible] = useState(defaultVisible);
  const [block, setBlock] = useState(defaultBlock);

  const ref = useRef(useMemo(() => ({
    height: null as number | null,
    innerRef: null as HTMLDivElement | null,
    outerRef: null as HTMLDivElement | null,
    resizeObserver: new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.borderBoxSize) {
          const contentBoxSize = (Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize) as ResizeObserverSize;
          const { innerRef, outerRef, height: prevHeight } = ref.current;
          const newHeight = Math.ceil(contentBoxSize.blockSize);
          if (innerRef && outerRef && prevHeight
            && prevHeight !== newHeight) {
            ref.current.height = newHeight;
            scrollParentRelative(newHeight - prevHeight);
            outerRef.style.height = `${newHeight}px`;
          }
        }
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []));

  const handleOuterLoad = useCallback((outerRef: HTMLDivElement | null) => {
    ref.current.outerRef = outerRef;
    if (outerRef && ref.current.height) {
      outerRef.style.height = `${ref.current.height}px`;
    }
  }, []);

  const handleInnerLoad = useCallback((innerRef: HTMLDivElement | null) => {
    if (innerRef) {
      const prevHeight = ref.current.height;
      ref.current.height = Math.ceil(innerRef.getBoundingClientRect().height);

      if (ref.current.outerRef) {
        // Somehow this fixes a scroll anchoring issue.
        ref.current.outerRef.style.height = `${ref.current.height}px`;

        if (prevHeight && ref.current.height && prevHeight !== ref.current.height) {
          scrollParentRelative(ref.current.height - prevHeight);
          ref.current.outerRef.style.height = `${ref.current.height}px`;
        }
      }

      onInnerLoad(item, innerRef, ref.current.height);

      ref.current.resizeObserver.observe(innerRef);
    } else if (ref.current.innerRef) {
      ref.current.resizeObserver.unobserve(ref.current.innerRef);
    }

    ref.current.innerRef = innerRef;
  }, [item, scrollParentRelative, onInnerLoad]);

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
  }, [item, aboveItem, belowItem, onMount, onUnmount]);

  return (
    <div
      ref={handleOuterLoad}
      className={styles.listItem}
      style={{
        display: visible || block ? 'block' : 'none',
        height: ref.current.height ? `${ref.current.height}px` : '1px',
        overflowAnchor: isOverflowAnchor ? 'auto' : undefined,
      }}
    >
      {visible && (
        <div
          ref={handleInnerLoad}
          className={styles.listItemInner}
        >
          <ItemRenderer
            item={item}
            aboveItem={aboveItem}
            belowItem={belowItem}
            columnIdx={columnIdx}
            hasRightColumn={hasRightColumn}
            {...otherItemProps}
          />
        </div>
      )}
    </div>
  );
});

export type ColumnProps = {
  reverse?: boolean,
  hasReachedEnd: boolean,
  onReachEnd: Memoed<(colIdx: number) => void>,
} & ListItemRendererProps;

type Props = {
  columnIdx: number,
  hasRightColumn: boolean,
  items: (string | number)[],
  addedItems?: Memoed<(string | number)[]>,
  initialVisibleItems: Set<string | number>,
  itemToRow: Map<string | number, Row>,
  scrollParentRelative: Memoed<(px: number) => void>,
} & ColumnProps;

export default function WindowedInfiniteScrollerColumn({
  columnIdx,
  hasRightColumn,
  items,
  addedItems,
  initialVisibleItems,
  reverse,
  itemToRow,
  ItemRenderer,
  otherItemProps,
  hasReachedEnd,
  onReachEnd,
  scrollParentRelative,
}: Props) {
  const getIsRouteActive = useGetIsRouteActive();
  const latestRef = useLatest({
    items,
    itemToRow,
    onReachEnd,
  });
  const ref = useRef(useConst(() => ({
    elemToItem: new Map() as Map<HTMLDivElement, string | number>,
    curVisibleItems: new Set<string | number>(initialVisibleItems),
    // todo: low/hard maybe split this into separate IntersectionObservers in each item
    observer: null as IntersectionObserver | null,
    overflowAnchorItem: null as string | number | null,
  })));
  const innerContainerRef = useInnerContainerRef();

  useEffect(() => {
    ref.current.observer = new IntersectionObserver(entries => {
      const changed = new Set<string | number>();
      for (const entry of entries) {
        const elem = entry.target as HTMLDivElement;
        const item = ref.current.elemToItem.get(elem);
        const row = item ? latestRef.current.itemToRow.get(item) : null;
        if (!item || !row) {
          continue;
        }

        if ((entry.intersectionRatio > 0 || entry.isIntersecting)
          && !ref.current.curVisibleItems.has(item)) {
          if ((!reverse && !row.hasBelowItem) || (reverse && !row.hasAboveItem)) {
            latestRef.current.onReachEnd(columnIdx);
          }
          ref.current.curVisibleItems.add(item);
          changed.add(item);
        } else if (entry.intersectionRatio === 0 && !entry.isIntersecting
          && ref.current.curVisibleItems.has(item)) {
          ref.current.curVisibleItems.delete(item);
          changed.add(item);
        }
      }

      if (changed.size) {
        for (const item of changed) {
          const row = latestRef.current.itemToRow.get(item);
          if (row && ref.current.curVisibleItems.has(item)) {
            row.setVisible(true);

            const itemIdx = latestRef.current.items.indexOf(item);
            const nextId = latestRef.current.items[itemIdx + 1];
            if (nextId) {
              latestRef.current.itemToRow.get(nextId)?.setBlock(true);
            }
          } else if (row) {
            row.setVisible(false);
          } else if (!process.env.PRODUCTION) {
            throw new Error('Expected item to exist.');
          }
        }
      }

      if (reverse) {
        const centerItem = latestRef.current.items
          .filter(item => ref.current.curVisibleItems.has(item))[
            Math.floor(ref.current.curVisibleItems.size / 2)
          ];
        if (centerItem !== ref.current.overflowAnchorItem) {
          if (ref.current.overflowAnchorItem) {
            const overflowAnchorElem = latestRef.current.itemToRow
              .get(ref.current.overflowAnchorItem)?.elem;
            TS.defined(overflowAnchorElem).style.overflowAnchor = '';
          }
          if (centerItem) {
            const centerElem = latestRef.current.itemToRow.get(centerItem)?.elem;
            TS.defined(centerElem).style.overflowAnchor = 'auto';
          }
          ref.current.overflowAnchorItem = centerItem;
        }
      }
    }, {
      root: innerContainerRef.current,
      rootMargin: '500px 0px',
    });

    for (const elem of ref.current.elemToItem.keys()) {
      ref.current.observer.observe(elem);
    }

    return () => {
      ref.current.observer?.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ref.current.observer = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerContainerRef.current]);

  const handleItemMount = useCallback((row: Row) => {
    latestRef.current.itemToRow.set(row.item, row);
    ref.current.elemToItem.set(row.elem, row.item);
    ref.current.observer?.observe(row.elem);
  }, [latestRef]);

  const handleItemInnerLoad = useCallback((
    item: string | number,
    elem: HTMLDivElement,
    height: number | null,
  ) => {
    if (!height) {
      return;
    }
    const row = latestRef.current.itemToRow.get(item);
    if (row) {
      row.height = height;
    } else if (addedItems?.includes(item) && getIsRouteActive()) {
      setTimeout(() => {
        elem.scrollIntoView(true);
      }, 0);
    }
  }, [latestRef, addedItems, getIsRouteActive]);

  const handleItemUnmount = useCallback((item: string | number) => {
    const row = latestRef.current.itemToRow.get(item);
    if (row) {
      ref.current.observer?.unobserve(row.elem);
      ref.current.elemToItem.delete(row.elem);
      latestRef.current.itemToRow.delete(row.item);
    }
  }, [latestRef]);

  return (
    <>
      {items.map((item, idx) => (
        <WindowedInfiniteScrollerListItem
          key={item}
          item={item}
          aboveItem={items[reverse ? idx + 1 : idx - 1]}
          belowItem={items[reverse ? idx - 1 : idx + 1]}
          columnIdx={columnIdx}
          hasRightColumn={hasRightColumn}
          defaultVisible={initialVisibleItems.has(item)}
          defaultBlock={
            initialVisibleItems.has(item) || initialVisibleItems.has(items[idx - 1])
          }
          isOverflowAnchor={ref.current.overflowAnchorItem === item}
          onMount={handleItemMount}
          onInnerLoad={handleItemInnerLoad}
          onUnmount={handleItemUnmount}
          ItemRenderer={ItemRenderer}
          otherItemProps={otherItemProps}
          scrollParentRelative={scrollParentRelative}
        />
      ))}

      {!hasReachedEnd && (
        <div
          key={[...ref.current.curVisibleItems].join(',')}
          className={styles.spinner}
        >
          <Spinner />
        </div>
      )}
    </>
  );
}
