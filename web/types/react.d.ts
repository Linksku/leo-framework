type ReactNode = React.ReactNode;
type ReactElement = React.ReactElement;
type SetState<T = any> = React.Dispatch<React.SetStateAction<T>>;

type StaticTypes = SetState<any>
| React.MutableRefObject<any>
| React.SVGFactory
| (React.SVGFactory | undefined);

class __MEMOED {
  private _memoed = true;
}

// todo: low/mid: maybe fork constate to add memoed
type Memoed<T> = T extends Primitive ? T
  : T extends __MEMOED ? T
  : T & __MEMOED;

type MemoDependencyList = ReadonlyArray<
  Primitive
  | StaticTypes
  // eslint-disable-next-line @typescript-eslint/ban-types
  | Memoed<object>
>;

// Doesn't work with generics: https://stackoverflow.com/questions/51300602
type MemoProps<Props extends ObjectOf<any>> = {
  [K in keyof Props]: Memoed<Props[K]>;
};

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
): [Memoed<S>, SetState<S>];

declare function useEffect(
  effect: React.EffectCallback,
  deps?: MemoDependencyList,
): void;

declare function useLayoutEffect(
  effect: React.EffectCallback,
  deps?: MemoDependencyList,
): void;
