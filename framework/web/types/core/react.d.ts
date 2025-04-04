type ReactNode = React.ReactNode;
type ReactElement = React.ReactElement;
type SetState<T> = Stable<React.Dispatch<React.SetStateAction<T>>>;
type SVGFactory = React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

// eslint-disable-next-line @typescript-eslint/naming-convention
declare class __STABLE {
  private __STABLE: true;
}

type StableObjects =
  | Date
  | Error
  | RegExp
  | File;

type Stable<T> = T extends Primitive ? T
  : T extends StableObjects ? T
  : T extends __STABLE ? T
  : T & __STABLE;

type StableTypes = Primitive
  | StableObjects
  | React.ComponentType<any>
  | React.RefObject<any>
  | SVGFactory
  | HTMLElement
  | __STABLE;

type StableDependencyList = ReadonlyArray<StableTypes>;

// Doesn't work with generics: https://stackoverflow.com/questions/51300602
type StableShallow<T> =
  T extends Primitive ? T
  : T extends __STABLE ? T
  : Stable<
    T extends StableTypes ? T
    : T extends Set<infer U> ? Set<Stable<U>>
    : T extends Map<K, V> ? Map<Stable<K>, Stable<V>>
    : T extends BuiltInObjects ? T
    : (keyof T) extends never ? T
    : {
      [K in keyof T]: Stable<T[K]>;
    }
  >;

type StableDeep<T> =
  T extends Primitive ? T
  : T extends __STABLE ? T
  : Stable<
    T extends StableTypes ? T
    : T extends Set<infer U> ? Set<StableDeep<U>>
    : T extends Map<infer K, infer V> ? Map<StableDeep<K>, StableDeep<V>>
    : T extends BuiltInObjects ? T
    : (keyof T) extends never ? T
    : {
      [K in keyof T]: StableDeep<T[K]>;
    }
  >;

declare namespace React {
  function memo<P extends object>(
    Component: FunctionComponent<P>,
    propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
  ): NamedExoticComponent<{
    [K in keyof P]: P[K] extends StableTypes
      ? P[K]
      : Stable<P[K]>;
  }>;
  function memo<T extends ComponentType<any>, P extends ComponentProps<T>>(
    Component: T,
    propsAreEqual?: (
      prevProps: Readonly<P>,
      nextProps: Readonly<P>,
    ) => boolean
  ): MemoExoticComponent<ComponentType<{
    [K in keyof P]: P[K] extends StableTypes
      ? P[K]
      : Stable<P[K]>;
  }>>;
}

// Change type to enable noImpicitAny
// https://stackoverflow.com/questions/69703041/enable-noimplicitany-for-functions-wrapped-with-usecallback
declare function useCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: StableDependencyList,
): Stable<T>;

declare function useMemo<T>(
  callback: () => T,
  deps: StableDependencyList,
): Stable<T>;

declare function useState<S>(
  initialState: S | (() => S),
): [
  S extends Primitive ? S : StableShallow<S>,
  SetState<S>,
];

declare function useReducer<R extends React.ReducerWithoutAction<any>, I>(
  reducer: R,
  initializerArg: I,
  initializer: (arg: I) => React.ReducerStateWithoutAction<R>
): [Stable<React.ReducerStateWithoutAction<R>>, Stable<React.DispatchWithoutAction>];

declare function useReducer<R extends React.ReducerWithoutAction<any>>(
  reducer: R,
  initializerArg: React.ReducerStateWithoutAction<R>,
  initializer?: undefined
): [Stable<React.ReducerStateWithoutAction<R>>, Stable<React.DispatchWithoutAction>];

declare function useReducer<R extends React.Reducer<any, any>>(
  reducer: R,
  initialState: React.ReducerState<R>,
  initializer?: undefined
): [Stable<React.ReducerState<R>>, Stable<React.Dispatch<React.ReducerAction<R>>>];

declare function useReducer<R extends React.Reducer<any, any>, I>(
  reducer: R,
  initializerArg: I,
  initializer: (arg: I) => React.ReducerState<R>
): [Stable<React.ReducerState<R>>, Stable<React.Dispatch<React.ReducerAction<R>>>];

declare function useReducer<R extends React.Reducer<any, any>, I>(
  reducer: R,
  initializerArg: I,
  initializer: (arg: I) => React.ReducerState<R>
): [Stable<React.ReducerState<R>>, Stable<React.Dispatch<React.ReducerAction<R>>>];

declare function useEffect(
  effect: React.EffectCallback,
  deps?: StableDependencyList,
): void;

declare function useLayoutEffect(
  effect: React.EffectCallback,
  deps?: StableDependencyList,
): void;

declare function useTransition(): [
  boolean,
  Stable<React.TransitionStartFunction>,
];
