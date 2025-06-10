import useGetIsMounted from 'utils/useGetIsMounted';

const RENDER_BATCH_INTERVAL = 100;
const RENDER_BATCH_MAX_SIZE = 20;
const LOAD_BATCH_TIMEOUT = 500;

type RenderBatch = {
  startTime: number,
  imgRefs: Map<
    // Use setShowImage as reference to component
    SetState<boolean>,
    {
      hasLoaded: boolean,
      getIsMounted: () => boolean,
      setShowImage: SetState<boolean>,
    }
  >,
  loadBatchTimer: number | null,
};

export const [
  BatchImagesLoadProvider,
  useBatchImagesLoad,
] = constate(
  function BatchImagesLoadStore() {
    const curRenderBatch = useRef<RenderBatch | null>(null);

    // todo: low/med keep batch open until end of render
    const getCurRenderBatch = useCallback(() => {
      if (!curRenderBatch.current?.startTime
        || performance.now() - curRenderBatch.current.startTime > RENDER_BATCH_INTERVAL
        || curRenderBatch.current.imgRefs.size >= RENDER_BATCH_MAX_SIZE) {
        const imgRefs: RenderBatch['imgRefs'] = new Map();
        curRenderBatch.current = {
          startTime: performance.now(),
          imgRefs,
          loadBatchTimer: null,
        };
      }

      return curRenderBatch.current;
    }, []);

    const queueBatchedLoad = useCallback((batch: RenderBatch) => {
      requestAnimationFrame(() => {
        if (!batch.imgRefs.size) {
          return;
        }

        if ([...batch.imgRefs.values()].every(cb => cb.hasLoaded)) {
          if (batch.loadBatchTimer) {
            clearTimeout(batch.loadBatchTimer);
            batch.loadBatchTimer = null;
          }

          for (const img of batch.imgRefs.values()) {
            if (img.getIsMounted()) {
              img.setShowImage(true);
              batch.imgRefs.delete(img.setShowImage);
            }
          }

          return;
        }

        if (!batch.loadBatchTimer) {
          batch.loadBatchTimer = window.setTimeout(() => {
            for (const img of batch.imgRefs.values()) {
              if (img.hasLoaded && img.getIsMounted()) {
                img.setShowImage(true);
                batch.imgRefs.delete(img.setShowImage);
              }
            }

            batch.loadBatchTimer = null;
          }, LOAD_BATCH_TIMEOUT);
        }
      });
    }, []);

    return useMemo(() => ({
      getCurRenderBatch,
      queueBatchedLoad,
    }), [
      getCurRenderBatch,
      queueBatchedLoad,
    ]);
  },
);

export type ImageHandlers = {
  showImage: boolean,
  ref: (img: HTMLImageElement | null) => void,
  onLoad: () => void,
  onError: () => void,
};

export function useImageHandlers(): {
  showImage: boolean,
  ref: (img: HTMLImageElement | null) => void,
  onLoad: () => void,
  onError: () => void,
  } {
  const { getCurRenderBatch, queueBatchedLoad } = useBatchImagesLoad() ?? {};
  const [showImage, setShowImage] = useState(false);
  const renderBatch = useRef<RenderBatch | null>(null);

  const getIsMounted = useGetIsMounted();
  const ref = useCallback((img: HTMLImageElement | null) => {
    let batch = renderBatch.current;
    if (!img) {
      if (batch?.imgRefs.has(setShowImage)) {
        batch.imgRefs.delete(setShowImage);
        if (!batch.imgRefs.size && batch.loadBatchTimer) {
          clearTimeout(batch.loadBatchTimer);
          batch.loadBatchTimer = null;
        }
      }
      return;
    }
    if (batch?.imgRefs.has(setShowImage)) {
      return;
    }

    batch = renderBatch.current = getCurRenderBatch();
    batch.imgRefs.set(
      // setShowImage is a reference to the img component
      setShowImage,
      {
        hasLoaded: img.complete,
        getIsMounted,
        setShowImage,
      },
    );

    if (img.complete) {
      queueBatchedLoad(batch);
    }
  }, [getCurRenderBatch, getIsMounted, queueBatchedLoad]);

  const onLoadOrError = useCallback(() => {
    if (!renderBatch.current) {
      return;
    }
    const imgRef = renderBatch.current.imgRefs.get(setShowImage);
    if (!imgRef) {
      return;
    }

    imgRef.hasLoaded = true;
    queueBatchedLoad(renderBatch.current);
  }, [queueBatchedLoad]);

  return {
    showImage,
    ref,
    onLoad: onLoadOrError,
    onError: onLoadOrError,
  };
}
