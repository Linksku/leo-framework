type ReactNode = React.ReactNode;
type ReactElement = React.ReactElement;
type SetState<T> = Memoed<React.Dispatch<React.SetStateAction<T>>>;

type StaticTypes = SetState<any>
  | React.MutableRefObject<any>
  | React.SVGFactory
  // todo: low/easy this was needed for old TS, might be fixed in new version
  | (React.SVGFactory | undefined);

class __MEMOED {
  private __MEMOED = true;
}

// todo: low/mid: maybe fork constate to add memoed
type Memoed<T> = T extends Primitive ? T
  : T extends __MEMOED ? T
  : T & __MEMOED;

type MemoedTypes = Primitive
  | StaticTypes
  | __MEMOED;

type MemoDependencyList = ReadonlyArray<MemoedTypes>;

// Doesn't work with generics: https://stackoverflow.com/questions/51300602
type MemoObjShallow<Obj extends ObjectOf<any>> = {
  [K in keyof Obj]: Memoed<Obj[K]>;
};

type MemoDeep<T> =
  T extends Primitive ? T
  : T extends __MEMOED ? T
  : Memoed<
    T extends Array<infer U> ? Array<MemoDeep<U>>
    : T extends Set<infer U> ? Set<Memoed<U>>
    : T extends Map<infer K, infer V> ? Map<K, Memoed<V>>
    : (keyof T) extends never ? T
    : { [K in keyof T]: MemoDeep<T[K]> }
  >;

declare function useCallback<T extends AnyFunction>(
  callback: T,
  deps: MemoDependencyList,
): Memoed<T>;

declare function useMemo<T extends any>(
  callback: () => T,
  deps: MemoDependencyList,
): Memoed<T>;

declare function useState<S>(
  initialState: S | (() => S),
): [
  // todo: low/mid add readonly
  Memoed<S>,
  SetState<S>,
];

declare function useReducer<R extends ReducerWithoutAction<any>>(
  reducer: R,
  initializerArg: ReducerStateWithoutAction<R>,
): [ReducerStateWithoutAction<R>, Memoed<DispatchWithoutAction>];

declare function useEffect(
  effect: React.EffectCallback,
  deps?: MemoDependencyList,
): void;

declare function useLayoutEffect(
  effect: React.EffectCallback,
  deps?: MemoDependencyList,
): void;
