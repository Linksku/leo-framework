import { addPopHandler, removePopHandler } from 'stores/history/HistoryStore';

export const [
  LightboxProvider,
  useLightboxStore,
  useShowLightbox,
] = constate(
  function LightboxStore() {
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const shownRef = useRef(false);

    const handlePopHistory = useCallback(() => {
      if (shownRef.current) {
        setMediaUrl(null);
        return true;
      }
      return false;
    }, []);

    const showLightbox = useCallback((url: string) => {
      setMediaUrl(url);

      addPopHandler(handlePopHistory);
    }, [handlePopHistory]);

    const hideLightbox = useCallback(() => {
      setMediaUrl(null);

      removePopHandler(handlePopHistory);
    }, [handlePopHistory]);

    useEffect(() => {
      shownRef.current = !!mediaUrl;
    }, [mediaUrl]);

    return useMemo(() => ({
      mediaUrl,
      showLightbox,
      hideLightbox,
    }), [mediaUrl, showLightbox, hideLightbox]);
  },
  function LightboxStore(val) {
    return val;
  },
  function ShowLightbox(val) {
    return val.showLightbox;
  },
);
