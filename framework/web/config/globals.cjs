module.exports = {
  // Node modules.
  constate: ['constate', 'default'],
  cx: ['clsx', 'default'],
  React: 'react',
  ReactCreateElement: ['react', 'createElement'],
  ReactFragment: ['react', 'Fragment'],
  useCallback: ['react', 'useCallback'],
  useContext: ['react', 'useContext'],
  useDebugValue: ['react', 'useDebugValue'],
  useEffect: ['react', 'useEffect'],
  useFormState: ['react-hook-form', 'useFormState'],
  useImperativeHandle: ['react', 'useImperativeHandle'],
  useLayoutEffect: ['react', 'useLayoutEffect'],
  useMemo: ['react', 'useMemo'],
  useReducer: ['react', 'useReducer'],
  useRef: ['react', 'useRef'],
  useState: ['react', 'useState'],
  // Core components.
  Button: ['./framework/web/components/ui/Button', 'default'],
  Card: ['./framework/web/components/ui/Card', 'default'],
  Checkbox: ['./framework/web/components/ui/Checkbox', 'default'],
  FileInput: ['./framework/web/components/ui/FileInput', 'default'],
  Input: ['./framework/web/components/ui/Input', 'default'],
  Link: ['./framework/web/components/ui/Link', 'default'],
  Radio: ['./framework/web/components/ui/Radio', 'default'],
  Select: ['./framework/web/components/ui/Select', 'default'],
  Spinner: ['./framework/web/components/ui/Spinner', 'default'],
  Switch: ['./framework/web/components/ui/Switch', 'default'],
  Table: ['./framework/web/components/ui/Table', 'default'],
  Textarea: ['./framework/web/components/ui/Textarea', 'default'],
  Typeahead: ['./framework/web/components/ui/Typeahead', 'default'],
  UncontrolledCheckbox: ['./framework/web/components/ui/UncontrolledCheckbox', 'default'],
  // Lib.
  EMPTY_ARR: ['./framework/web/utils/emptyArr', 'default'],
  EMPTY_OBJ: ['./framework/web/utils/emptyObj', 'default'],
  ErrorLogger: ['./framework/web/services/ErrorLogger', 'default'],
  HOME_TABS: ['./app/web/config/homeTabs', 'HOME_TABS'],
  markMemoed: ['./framework/web/utils/markMemoed', 'default'],
  NOOP: ['./framework/web/utils/noop', 'default'],
  TestIds: ['./framework/shared/consts/testIds', 'default'],
  useAllEntities: ['./framework/web/hooks/entities/useAllEntities', 'default'],
  useApi: ['./framework/web/hooks/useApi/useApi', 'default'],
  useCatchAsync: ['./framework/web/hooks/useCatchAsync', 'default'],
  useConst: ['./framework/web/hooks/useConst', 'default'],
  useDeferredApi: ['./framework/web/hooks/useApi/useDeferredApi', 'default'],
  useDeepMemoObj: ['./framework/web/hooks/useDeepMemoObj', 'default'],
  useDynamicCallback: ['./framework/web/hooks/useDynamicCallback', 'default'],
  useEntity: ['./framework/web/hooks/entities/useEntity', 'default'],
  useEntitiesArr: ['./framework/web/hooks/entities/useEntitiesArr', 'default'],
  useForm: ['./framework/web/hooks/useForm', 'default'],
  useLatest: ['./framework/web/hooks/useLatest', 'default'],
  useLog: ['./framework/web/hooks/useLog', 'default'],
  useLogChanged: ['./framework/web/hooks/useLogChanged', 'default'],
  useLogLifecycle: ['./framework/web/hooks/useLogLifecycle', 'default'],
  usePushHome: ['./framework/web/hooks/usePushHome', 'default'],
  useRelation: ['./framework/web/hooks/entities/useRelation', 'default'],
  useReplaceHome: ['./framework/web/hooks/useReplaceHome', 'default'],
  useRequiredRelation: ['./framework/web/hooks/entities/useRequiredRelation', 'default'],
  useRequiredEntity: ['./framework/web/hooks/entities/useRequiredEntity', 'default'],
  useSse: ['./framework/web/hooks/useSse', 'default'],
  useSseArr: ['./framework/web/hooks/useSseArr', 'default'],
  useStateStable: ['./framework/web/hooks/useStateStable', 'default'],
  wrapPromise: ['./framework/web/utils/wrapPromise', 'default'],
  // Constate stores.
  useAlertsStore: ['./framework/web/stores/AlertsStore', 'useAlertsStore'],
  useApiStore: ['./framework/web/stores/ApiStore', 'useApiStore'],
  useAuthStore: ['./framework/web/stores/AuthStore', 'useAuthStore'],
  useEntitiesStore: ['./framework/web/stores/EntitiesStore', 'useEntitiesStore'],
  useHistoryStore: ['./framework/web/stores/HistoryStore', 'useHistoryStore'],
  useHomeNavStore: ['./framework/web/stores/HomeNavStore', 'useHomeNavStore'],
  useNotifsStore: ['./framework/web/stores/NotifsStore', 'useNotifsStore'],
  useRelationsStore: ['./framework/web/stores/RelationsStore', 'useRelationsStore'],
  useRouteStore: ['./framework/web/stores/RouteStore', 'useRouteStore'],
  useSlideUpStore: ['./framework/web/stores/SlideUpStore', 'useSlideUpStore'],
  useSseStore: ['./framework/web/stores/SseStore', 'useSseStore'],
  useStacksNavStore: ['./framework/web/stores/StacksNavStore', 'useStacksNavStore'],
  useToastsStore: ['./framework/web/stores/ToastsStore', 'useToastsStore'],
  useUIFrameStore: ['./framework/web/stores/UIFrameStore', 'useUIFrameStore'],
  // Constate split.
  useAuthState: ['./framework/web/stores/AuthStore', 'useAuthState'],
  useCurrentUserId: ['./framework/web/stores/AuthStore', 'useCurrentUserId'],
  useGlobalMemo: ['./framework/web/stores/GlobalMemoStore', 'useGlobalMemo'],
  useGlobalState: ['./framework/web/stores/GlobalStateStore', 'useGlobalState'],
  useHideSlideUp: ['./framework/web/stores/SlideUpStore', 'useHideSlideUp'],
  useHomeTab: ['./framework/web/stores/HomeNavStore', 'useHomeTab'],
  useMutateApiCache: ['./framework/web/stores/ApiStore', 'useMutateApiCache'],
  useMutateEntity: ['./framework/web/stores/EntitiesStore', 'useMutateEntity'],
  usePushPath: ['./framework/web/stores/HistoryStore', 'usePushPath'],
  useReloadPage: ['./framework/web/stores/UIFrameStore', 'useReloadPage'],
  useReplacePath: ['./framework/web/stores/HistoryStore', 'useReplacePath'],
  useRouteMatches: ['./framework/web/stores/RouteStore', 'useRouteMatches'],
  useRouteQuery: ['./framework/web/stores/RouteStore', 'useRouteQuery'],
  useShowAlert: ['./framework/web/stores/AlertsStore', 'useShowAlert'],
  useShowConfirm: ['./framework/web/stores/AlertsStore', 'useShowConfirm'],
  useShowSlideUp: ['./framework/web/stores/SlideUpStore', 'useShowSlideUp'],
  useShowToast: ['./framework/web/stores/ToastsStore', 'useShowToast'],
};
