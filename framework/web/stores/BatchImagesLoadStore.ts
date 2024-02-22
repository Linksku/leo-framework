import useGetIsMounted from 'hooks/useGetIsMounted';

const BATCH_INTERVAL = 50;
const BATCH_TIMEOUT = 500;
const BATCH_MAX_SIZE = 10;

type Batch = {
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
        || curBatch.current.imgRefs.size >= BATCH_MAX_SIZE) {
        const imgRefs: Batch['imgRefs'] = new Map();
        curBatch.current = {
          startTime: performance.now(),
          imgRefs,
        };

        setTimeout(() => {
          for (const imgRef of imgRefs.values()) {
            if (imgRef.hasLoaded && imgRef.getIsMounted()) {
              imgRef.setShowImage(true);
            }
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
  const [showImage, setShowImage] = useState(false);
  const batch = useRef<Batch | null>(null);

  const getIsMounted = useGetIsMounted();
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (!img || batch.current) {
      return;
    }
    if (img.complete) {
      setShowImage(true);
      return;
    }

    batch.current = getCurBatch();
    batch.current.imgRefs.set(setShowImage, {
      hasLoaded: false,
      getIsMounted,
      setShowImage,
    });
  }, [getCurBatch, getIsMounted]);

  const onLoadOrError = useCallback(() => {
    if (!batch.current) {
      return;
    }

    const cbRef = batch.current.imgRefs.get(setShowImage);
    if (cbRef) {
      cbRef.hasLoaded = true;
      if (performance.now() - batch.current.startTime > BATCH_TIMEOUT) {
        cbRef.setShowImage(true);
      }
    }

    if ([...batch.current.imgRefs.values()].every(cb => cb.hasLoaded)) {
      for (const cb of batch.current.imgRefs.values()) {
        if (cb.getIsMounted()) {
          cb.setShowImage(true);
        }
      }
    }
  }, [batch]);

  return {
    showImage,
    ref,
    onLoad: onLoadOrError,
    onError: onLoadOrError,
  };
}
