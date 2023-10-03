export type Toast = {
  id: number,
  msg: string,
  closeAfter: number | null,
};

const DEFAULT_CLOSE_AFTER = 3000;

let _nextToastId = 0;

const ToastsState = {
  hideToastTimer: null as number | null,
  removeToastTimer: null as number | null,
};

export const [
  ToastsProvider,
  useToastsStore,
  useShowToast,
] = constate(
  function ToastsStore() {
    const [{
      toast,
      isHiding,
    }, setState] = useStateStable({
      toast: null as Toast | null,
      isHiding: false,
    });

    const hideToast = useCallback(() => {
      setState({ isHiding: true });

      if (ToastsState.removeToastTimer !== null) {
        clearTimeout(ToastsState.removeToastTimer);
      }
      ToastsState.removeToastTimer = window.setTimeout(() => {
        setState({ toast: null, isHiding: false });
      }, 200);
    }, [setState]);

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

      if (ToastsState.hideToastTimer !== null) {
        clearTimeout(ToastsState.hideToastTimer);
      }
      ToastsState.hideToastTimer = window.setTimeout(
        hideToast,
        closeAfter ?? DEFAULT_CLOSE_AFTER,
      );
    }, [hideToast, setState]);

    return useMemo(() => ({
      toast,
      showToast,
      hideToast,
      isHidingToast: isHiding,
    }), [toast, showToast, hideToast, isHiding]);
  },
  function ToastsStore(val) {
    return val;
  },
  function ShowToast(val) {
    return val.showToast;
  },
);
