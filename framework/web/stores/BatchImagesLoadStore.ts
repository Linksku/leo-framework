const BATCH_INTERVAL = 50;
const BATCH_TIMEOUT = 500;
const BATCH_MAX_SIZE = 10;

type Batch = {
  startTime: number | null,
  loadingCbs: Set<SetState<boolean>>,
  setHasLoadedCbs: Set<SetState<boolean>>,
};

export const [
  BatchImagesLoadProvider,
  useBatchImagesLoad,
] = constate(
  function BatchImagesLoadStore() {
    const curBatch = useRef<Batch | null>(null);

    const getCurBatch = useCallback(() => {
      if (!curBatch.current?.startTime
        || performance.now() - curBatch.current.startTime > BATCH_INTERVAL
        || curBatch.current.setHasLoadedCbs.size >= BATCH_MAX_SIZE) {
        curBatch.current = {
          startTime: performance.now(),
          loadingCbs: new Set(),
          setHasLoadedCbs: new Set(),
        };

        const { setHasLoadedCbs } = curBatch.current;
        setTimeout(() => {
          for (const cb of setHasLoadedCbs) {
            cb(true);
          }
        }, BATCH_TIMEOUT);
      }

      return curBatch.current;
    }, []);

    return useMemo(() => ({
      getCurBatch,
    }), [
      getCurBatch,
    ]);
  },
);

export type ImageHandlers = {
  showImage: boolean,
  ref: (img: HTMLImageElement | null) => void,
  onLoad: () => void,
  onError: () => void,
};

export function useImageHandlers() {
  const { getCurBatch } = useBatchImagesLoad();
  const [hasLoaded, setHasLoaded] = useState(false);
  const batch = useRef<Batch | null>(null);

  const ref = useCallback((img: HTMLImageElement | null) => {
    if (!img || batch.current) {
      return;
    }
    if (img.complete) {
      setHasLoaded(true);
      return;
    }

    batch.current = getCurBatch();
    // This is just a reference to the current hook
    batch.current.loadingCbs.add(setHasLoaded);
    batch.current.setHasLoadedCbs.add(setHasLoaded);
  }, [getCurBatch]);

  const onLoadOrError = useCallback(() => {
    if (!batch.current?.loadingCbs.size) {
      return;
    }

    batch.current.loadingCbs.delete(setHasLoaded);

    if (!batch.current.loadingCbs.size) {
      for (const cb of batch.current.setHasLoadedCbs) {
        cb(true);
      }
    }
  }, [batch]);

  return {
    showImage: hasLoaded,
    ref,
    onLoad: onLoadOrError,
    onError: onLoadOrError,
  };
}
