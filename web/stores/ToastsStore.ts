export type Toast = {
  id: number,
  msg: string,
  closeAfter: number | null,
};

const DEFAULT_CLOSE_AFTER = 3000;

let _nextToastId = 0;

const [
  ToastsProvider,
  useToastsStore,
  useShowToast,
] = constate(
  function ToastsStore() {
    const [{
      toast,
      isHiding,
    }, setState] = useState({
      toast: null as Toast | null,
      isHiding: false,
    });
    const ref = useRef({
      hideToastTimer: null as number | null,
      removeToastTimer: null as number | null,
    });

    const hideToast = useCallback(() => {
      setState(s => ({
        ...s,
        isHiding: true,
      }));

      if (ref.current.removeToastTimer !== null) {
        clearTimeout(ref.current.removeToastTimer);
      }
      ref.current.removeToastTimer = window.setTimeout(() => {
        setState({
          toast: null,
          isHiding: false,
        });
      }, 200);
    }, []);

    const showToast = useCallback(({
      msg = '',
      closeAfter = null as number | null,
    }: Partial<Omit<Toast, 'id'>>) => {
      const toastId = _nextToastId;
      _nextToastId++;

      setState({
        toast: {
          id: toastId,
          msg,
          closeAfter,
        },
        isHiding: false,
      });

      if (ref.current.hideToastTimer !== null) {
        clearTimeout(ref.current.hideToastTimer);
      }
      ref.current.hideToastTimer = window.setTimeout(
        hideToast,
        closeAfter ?? DEFAULT_CLOSE_AFTER,
      );
    }, [hideToast]);

    return useDeepMemoObj({
      toast,
      showToast,
      hideToast,
      isHidingToast: isHiding,
    });
  },
  function ToastsStore(val) {
    return val;
  },
  function ShowToast(val) {
    return val.showToast;
  },
);

export { ToastsProvider, useToastsStore, useShowToast };
