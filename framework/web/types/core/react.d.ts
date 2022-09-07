type ReactNode = React.ReactNode;
type ReactElement = React.ReactElement;
type SetState<T> = Memoed<React.Dispatch<React.SetStateAction<T>>>;

// eslint-disable-next-line @typescript-eslint/naming-convention
class __MEMOED {
  private __MEMOED = true;
}

type Memoed<T> = T extends Primitive ? T
  : T extends __MEMOED ? T
  : T & __MEMOED;

type StableTypes = Primitive
  | ComponentType<any>
  | React.MutableRefObject<any>
  | React.SVGFactory
  | __MEMOED;

type MemoDependencyList = ReadonlyArray<StableTypes>;

// Doesn't work with generics: https://stackoverflow.com/questions/51300602
type MemoObjShallow<Obj extends ObjectOf<any>> = {
  [K in keyof Obj]: Memoed<Obj[K]>;
};

type MemoDeep<T> =
  T extends Primitive ? T
  : T extends __MEMOED ? T
  : Memoed<
    T extends Set<infer U> ? Set<Memoed<U>>
    : T extends Map<infer K, infer V> ? Map<K, Memoed<V>>
    : T extends BuiltInObjects ? T
    : (keyof T) extends never ? T
    : { [K in keyof T]: MemoDeep<T[K]> }
  >;

declare namespace React {
  function memo<P extends object>(
    Component: FunctionComponent<P>,
    propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
  ): NamedExoticComponent<{
    [K in keyof P]: P[K] extends StableTypes
      ? P[K]
      : Memoed<P[K]>;
  }>;
  function memo<T extends ComponentClass<any>, P extends ComponentProps<T>>(
    Component: T,
    propsAreEqual?: (
      prevProps: Readonly<P>,
      nextProps: Readonly<P>,
    ) => boolean
  ): MemoExoticComponent<ComponentClass<{
    [K in keyof P]: P[K] extends StableTypes
      ? P[K]
      : Memoed<P[K]>;
  }>>;
}

// Change type to enable noImpicitAny
// https://stackoverflow.com/questions/69703041/enable-noimplicitany-for-functions-wrapped-with-usecallback
declare function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: MemoDependencyList,
): Memoed<T>;

declare function useMemo<T>(
  callback: () => T,
  deps: MemoDependencyList,
): Memoed<T>;

declare function useState<S>(
  initialState: S | (() => S),
): [
  Memoed<
    S extends Primitive ? S
    : (keyof S) extends never ? S
    : MemoObjShallow<S>
  >,
  SetState<S>,
];

function useReducer<R extends React.ReducerWithoutAction<any>, I>(
  reducer: R,
  initializerArg: I,
  initializer: (arg: I) => React.ReducerStateWithoutAction<R>
): [Memoed<React.ReducerStateWithoutAction<R>>, Memoed<React.DispatchWithoutAction>];

function useReducer<R extends React.ReducerWithoutAction<any>>(
  reducer: R,
  initializerArg: React.ReducerStateWithoutAction<R>,
  initializer?: undefined
): [Memoed<ReducerStateWithoutAction<R>>, Memoed<React.DispatchWithoutAction>];

declare function useReducer<R extends React.Reducer<any, any>>(
  reducer: R,
  initialState: React.ReducerState<R>,
  initializer?: undefined
): [Memoed<React.ReducerState<R>>, Memoed<React.Dispatch<React.ReducerAction<R>>>];

declare function useReducer<R extends React.Reducer<any, any>, I>(
  reducer: R,
  initializerArg: I,
  initializer: (arg: I) => React.ReducerState<R>
): [Memoed<React.ReducerState<R>>, Memoed<React.Dispatch<React.ReducerAction<R>>>];

function useReducer<R extends React.Reducer<any, any>, I>(
  reducer: R,
  initializerArg: I,
  initializer: (arg: I) => React.ReducerState<R>
): [Memoed<React.ReducerState<R>>, Memoed<Memoed.Dispatch<React.ReducerAction<R>>>];

declare function useEffect(
  effect: React.EffectCallback,
  deps?: MemoDependencyList,
): void;

declare function useLayoutEffect(
  effect: React.EffectCallback,
  deps?: MemoDependencyList,
): void;
