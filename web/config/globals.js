// todo: low/mid enable adding globals without restarting server
const globals = {
  // Node modules.
  batchedUpdates: ['react-dom', 'unstable_batchedUpdates'],
  constate: ['constate', 'default'],
  cn: 'classnames',
  dayjs: 'dayjs',
  React: 'react',
  ReactCreateElement: ['react', 'createElement'],
  ReactFragment: ['react', 'Fragment'],
  useCallback: ['react', 'useCallback'],
  useContext: ['react', 'useContext'],
  useDebugValue: ['react', 'useDebugValue'],
  useEffect: ['react', 'useEffect'],
  useForm: ['react-hook-form', 'useForm'],
  useFormState: ['react-hook-form', 'useFormState'],
  useImperativeHandle: ['react', 'useImperativeHandle'],
  useLayoutEffect: ['react', 'useLayoutEffect'],
  useMemo: ['react', 'useMemo'],
  useReducer: ['react', 'useReducer'],
  useRef: ['react', 'useRef'],
  useState: ['react', 'useState'],
  // Built-ins.
  hasOwnProperty: ['./shared/lib/builtIns/hasOwnProperty', 'default'],
  objectEntries: ['./shared/lib/builtIns/objectEntries', 'default'],
  objectKeys: ['./shared/lib/builtIns/objectKeys', 'default'],
  // Core components.
  Button: ['./web/components/ui/Button', 'default'],
  Card: ['./web/components/ui/Card', 'default'],
  Checkbox: ['./web/components/ui/Checkbox', 'default'],
  Dropdown: ['./web/components/ui/Dropdown', 'default'],
  FileInput: ['./web/components/ui/FileInput', 'default'],
  Input: ['./web/components/ui/Input', 'default'],
  Radio: ['./web/components/ui/Radio', 'default'],
  Select: ['./web/components/ui/Select', 'default'],
  Spinner: ['./web/components/ui/Spinner', 'default'],
  Table: ['./web/components/ui/Table', 'default'],
  Textarea: ['./web/components/ui/Textarea', 'default'],
  Typeahead: ['./web/components/ui/Typeahead', 'default'],
  UncontrolledCheckbox: ['./web/components/ui/UncontrolledCheckbox', 'default'],
  // Lib.
  defined: ['./shared/lib/defined', 'default'],
  EMPTY_ARR: ['./web/lib/emptyArr', 'default'],
  EMPTY_OBJ: ['./web/lib/emptyObj', 'default'],
  ErrorLogger: ['./web/lib/ErrorLogger', 'default'],
  markMemoed: ['./web/lib/markMemoed', 'default'],
  NOOP: ['./web/lib/noop', 'default'],
  pause: ['./shared/lib/pause', 'default'],
  useApi: ['./web/lib/hooks/useApi/useApi', 'default'],
  useDeferredApi: ['./web/lib/hooks/useApi/useDeferredApi', 'default'],
  useDeepMemoObj: ['./web/lib/hooks/useDeepMemoObj', 'default'],
  useSse: ['./web/lib/hooks/useSse', 'default'],
  // Constate stores.
  useAlertsStore: ['./web/stores/AlertsStore', 'useAlertsStore'],
  useAuthStore: ['./web/stores/AuthStore', 'useAuthStore'],
  useHistoryStore: ['./web/stores/HistoryStore', 'useHistoryStore'],
  useSlideUpStore: ['./web/stores/SlideUpStore', 'useSlideUpStore'],
  useSseStore: ['./web/stores/SseStore', 'useSseStore'],
  useStacksStore: ['./web/stores/StacksStore', 'useStacksStore'],
  useToastsStore: ['./web/stores/ToastsStore', 'useToastsStore'],
  // Constate split.
  useAuthToken: ['./web/stores/AuthStore', 'useAuthToken'],
  useCreateEntities: ['./web/stores/EntitiesStore', 'useCreateEntities'],
  useCurrentUser: ['./web/lib/hooks/useCurrentUser', 'default'],
  useEntities: ['./web/stores/EntitiesStore', 'useEntities'],
  useEntitiesEE: ['./web/stores/EntitiesStore', 'useEntitiesEE'],
  useEntity: ['./web/stores/EntitiesStore', 'useEntity'],
  useGlobalMemo: ['./web/stores/GlobalMemoStore', 'useGlobalMemo'],
  useGlobalState: ['./web/stores/GlobalStateStore', 'useGlobalState'],
  useHideSlideUp: ['./web/stores/SlideUpStore', 'useHideSlideUp'],
  useLoadEntities: ['./web/stores/EntitiesStore', 'useLoadEntities'],
  usePushPath: ['./web/stores/HistoryStore', 'usePushPath'],
  useDeleteEntities: ['./web/stores/EntitiesStore', 'useDeleteEntities'],
  useReplacePath: ['./web/stores/HistoryStore', 'useReplacePath'],
  useRequiredEntity: ['./web/stores/EntitiesStore', 'useRequiredEntity'],
  useShowAlert: ['./web/stores/AlertsStore', 'useShowAlert'],
  useShowConfirm: ['./web/stores/AlertsStore', 'useShowConfirm'],
  useShowSlideUp: ['./web/stores/SlideUpStore', 'useShowSlideUp'],
  useShowToast: ['./web/stores/ToastsStore', 'useShowToast'],
  useUpdateEntities: ['./web/stores/EntitiesStore', 'useUpdateEntities'],
};

module.exports = globals;
