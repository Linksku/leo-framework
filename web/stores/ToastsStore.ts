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
    const [toasts, setToasts] = useState([] as Toast[]);

    const showToast = useCallback(({
      msg = '',
      closeAfter = null as number | null,
    }: Partial<Omit<Toast, 'id'>>) => {
      const toastId = _nextToastId;
      _nextToastId++;

      setToasts(arr => [...arr, {
        id: toastId,
        msg,
        closeAfter,
      }]);

      setTimeout(() => {
        requestAnimationFrame(() => {
          setToasts(arr => (arr.some(a => a.id === toastId)
            ? arr.filter(a => a.id !== toastId)
            : arr));
        });
      }, closeAfter ?? DEFAULT_CLOSE_AFTER);
    }, [setToasts]);

    const hideFirstToast = useCallback(() => {
      setToasts(arr => arr.slice(1));
    }, [setToasts]);

    return useDeepMemoObj({
      toasts,
      showToast,
      hideFirstToast,
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
