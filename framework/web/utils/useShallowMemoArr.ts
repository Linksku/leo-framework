import useAccumulatedVal from 'utils/useAccumulatedVal';

function useShallowMemoArr<T>(arr: T[]): Stable<T[]>;

function useShallowMemoArr<T>(arr: T[] | null): Stable<T[]> | null;

function useShallowMemoArr<T>(arr: T[] | null) {
  return useAccumulatedVal(
    null as T[] | null,
    s => {
      if (!s || !arr) {
        return arr;
      }
      if (s.length !== arr.length) {
        return arr;
      }
      for (let i = 0; i < s.length; i++) {
        if (s[i] !== arr[i]) {
          return arr;
        }
      }
      return s;
    },
  );
}

export default useShallowMemoArr;
