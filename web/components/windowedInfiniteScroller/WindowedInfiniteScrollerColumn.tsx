import useMountedState from 'react-use/lib/useMountedState';

import useLatest from 'lib/hooks/useLatest';
import { useThrottle } from 'lib/throttle';

import styles from './WindowedInfiniteScrollerColumnStyles.scss';

export type Item = {
  id: number,
  idx: number,
  setVisible: (visible: boolean) => void,
  setBlock: (block: boolean) => void,
  elem: HTMLDivElement,
  height?: number | null,
};

export type ItemRendererProps<
  // eslint-disable-next-line @typescript-eslint/ban-types
  OtherProps extends ObjectOf<any> = {}
> = {
  otherItemProps?: Memoed<OtherProps>,
  ItemRenderer: React.MemoExoticComponent<React.ComponentType<{
    itemId: number,
    prevItemId: number,
    nextItemId: number,
    columnIdx: number,
  } & OtherProps>>,
};

type ListItemProps = {
  id: number,
  idx: number,
  prevId: number,
  nextId: number,
  columnIdx: number,
  defaultVisible: boolean,
  defaultBlock: boolean,
  onMount: Memoed<(params: Item) => void>,
  onInnerLoad: Memoed<(id: number, height: number | null) => void>,
  onUnmount: Memoed<(id: number) => void>,
  scrollParentRelative: Memoed<(px: number) => void>,
} & ItemRendererProps;

function WindowedInfiniteScrollerListItem({
  id,
  idx,
  prevId,
  nextId,
  columnIdx,
  ItemRenderer,
  otherItemProps,
  defaultVisible,
  defaultBlock,
  onMount,
  onInnerLoad,
  onUnmount,
  scrollParentRelative,
}: ListItemProps) {
  const [state, setState] = useState({
    visible: defaultVisible,
    block: defaultBlock,
  });

  const ref = useRef({
    height: null as number | null,
    innerRef: null as HTMLDivElement | null,
    outerRef: null as HTMLDivElement | null,
  });

  const handleOuterLoad = useCallback((outerRef: HTMLDivElement | null) => {
    ref.current.outerRef = outerRef;
    if (outerRef && ref.current.height) {
      outerRef.style.height = `${ref.current.height}px`;
    }
  }, []);

  const handleInnerLoad = useCallback((innerRef: HTMLDivElement | null) => {
    ref.current.innerRef = innerRef;
    if (innerRef) {
      const prevHeight = ref.current.height;
      ref.current.height = innerRef.clientHeight;
      if (ref.current.outerRef) {
        // Somehow this fixes a scroll anchoring issue.
        ref.current.outerRef.style.height = `${ref.current.height}px`;
      }
      if (prevHeight && prevHeight !== ref.current.height
        && ref.current.height && ref.current.outerRef) {
        scrollParentRelative(ref.current.height - prevHeight);
        ref.current.outerRef.style.height = `${ref.current.height}px`;
      }
      onInnerLoad(id, ref.current.height);
    }
  }, [id, scrollParentRelative, onInnerLoad]);

  // If prevId or nextId changes, height can change.
  useEffect(() => {
    const { innerRef, outerRef, height: prevHeight } = ref.current;
    if (innerRef && outerRef && prevHeight) {
      ref.current.height = innerRef.clientHeight;
      scrollParentRelative(ref.current.height - prevHeight);
      outerRef.style.height = `${ref.current.height}px`;
    }
  }, [scrollParentRelative, prevId, nextId]);

  useEffect(() => {
    if (ref.current.outerRef) {
      onMount({
        id,
        idx,
        setVisible: (visible: boolean) => setState(s => (
          s.visible === visible
            ? s
            : {
              ...s,
              visible,
            }
        )),
        setBlock: (block: boolean) => setState(s => (
          s.block === block
            ? s
            : {
              ...s,
              block,
            }
        )),
        elem: ref.current.outerRef,
        height: ref.current.height,
      });
    }

    return () => {
      onUnmount(id);
    };
  }, [id, idx, onMount, onUnmount]);

  return (
    <div
      ref={handleOuterLoad}
      className={styles.listItem}
      style={{
        display: state.visible || state.block ? 'block' : 'none',
        height: ref.current.height ? `${ref.current.height}px` : '1px',
        overflowAnchor: state.visible ? 'auto' : 'none',
      }}
    >
      {state.visible
        ? (
          <div ref={handleInnerLoad}>
            {/* @ts-ignore no idea */}
            <ItemRenderer
              itemId={id}
              prevItemId={prevId}
              nextItemId={nextId}
              columnIdx={columnIdx}
              {...otherItemProps}
            />
          </div>
        )
        : null}
    </div>
  );
}

export type ColumnProps = {
  reverse: boolean,
  hasCompleted: boolean,
  onReachedEnd: () => void,
} & ItemRendererProps;

type Props = {
  columnIdx: number,
  itemIds: number[],
  initialVisibleIds: Set<number>,
  idToItem: Map<number, Item>,
  scrollParentRelative: Memoed<(px: number) => void>,
} & ColumnProps;

export default function WindowedInfiniteScrollerColumn({
  columnIdx,
  itemIds,
  initialVisibleIds,
  reverse,
  hasCompleted,
  idToItem,
  ItemRenderer,
  otherItemProps,
  onReachedEnd,
  scrollParentRelative,
}: Props) {
  const [spinnerShown, setSpinnerShown] = useState(!hasCompleted);
  const latestRef = useLatest({
    itemIds,
    idToItem,
    onReachedEnd,
    hasCompleted,
  });
  const isMounted = useMountedState();
  const ref = useRef(useMemo(() => ({
    elemToId: new Map() as Map<HTMLDivElement, number>,
    curVisibleIds: new Set<number>(initialVisibleIds),
    // todo: low/hard maybe split this into separate IntersectionObservers in each item
    observer: new IntersectionObserver(entries => {
      if (!isMounted()) {
        return;
      }

      const changed = new Set<number>();
      for (const entry of entries) {
        const elem = entry.target as HTMLDivElement;
        const id = ref.current.elemToId.get(elem);
        const item = id ? latestRef.current.idToItem.get(id) : null;
        if (!id || !item) {
          continue;
        }

        if (entry.intersectionRatio > 0 || entry.isIntersecting) {
          if (item.idx === latestRef.current.itemIds.length - 1) {
            if (!latestRef.current.hasCompleted) {
              setTimeout(() => {
                latestRef.current.onReachedEnd();
              }, 0);
            } else {
              setSpinnerShown(false);
            }
          }
          ref.current.curVisibleIds.add(id);
          changed.add(id);
        } else if (entry.intersectionRatio === 0 && !entry.isIntersecting) {
          ref.current.curVisibleIds.delete(id);
          changed.add(id);
        }
      }

      if (changed.size) {
        batchedUpdates(() => {
          for (const id of changed) {
            const item = latestRef.current.idToItem.get(id);
            if (item && ref.current.curVisibleIds.has(id)) {
              item.setVisible(true);

              const itemIdx = latestRef.current.itemIds.indexOf(id);
              const nextId = latestRef.current.itemIds[itemIdx + 1];
              if (nextId) {
                latestRef.current.idToItem.get(nextId)?.setBlock(true);
              }
            } else if (item) {
              item.setVisible(false);
            } else if (process.env.NODE_ENV !== 'production') {
              throw new Error('Expected item to exist.');
            }
          }
        });
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []));

  const handleItemMount = useCallback((item: Item) => {
    latestRef.current.idToItem.set(item.id, item);
    ref.current.elemToId.set(item.elem, item.id);
    ref.current.observer.observe(item.elem);
  }, [latestRef]);

  const handleItemInnerLoad = useCallback((id, height: number | null) => {
    if (!height) {
      return;
    }
    const item = latestRef.current.idToItem.get(id);
    if (item) {
      item.height = height;
    }
  }, [latestRef]);

  const handleItemUnmount = useCallback((id: number) => {
    const item = latestRef.current.idToItem.get(id);
    if (item) {
      ref.current.observer.unobserve(item.elem);
      ref.current.elemToId.delete(item.elem);
      latestRef.current.idToItem.delete(item.id);
    }
  }, [latestRef]);

  const handleResize = useThrottle(
    () => {
      requestAnimationFrame(() => {
        for (const id of latestRef.current.itemIds) {
          const item = latestRef.current.idToItem.get(id);
          if (item && ref.current.curVisibleIds.has(id)) {
            const innerElem = item.elem.firstElementChild;
            if (innerElem) {
              item.height = innerElem.clientHeight;
              item.elem.style.height = `${item.height}px`;
            }
          }
        }
      });
    },
    {
      timeout: 100,
      allowSchedulingDuringDelay: true,
    },
  );

  useEffect(() => {
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return (
    <>
      {itemIds.map((id, idx) => (
        <WindowedInfiniteScrollerListItem
          key={id}
          id={id}
          idx={idx}
          prevId={itemIds[reverse ? idx + 1 : idx - 1]}
          nextId={itemIds[reverse ? idx - 1 : idx + 1]}
          columnIdx={columnIdx}
          defaultVisible={initialVisibleIds.has(id)}
          defaultBlock={
            initialVisibleIds.has(id)
            || initialVisibleIds.has(itemIds[reverse ? idx + 1 : idx - 1])
          }
          onMount={handleItemMount}
          onInnerLoad={handleItemInnerLoad}
          onUnmount={handleItemUnmount}
          ItemRenderer={ItemRenderer}
          otherItemProps={otherItemProps}
          scrollParentRelative={scrollParentRelative}
        />
      ))}

      {spinnerShown && !hasCompleted && (
        <div className={styles.spinner}>
          <Spinner />
        </div>
      )}
    </>
  );
}
