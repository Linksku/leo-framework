import useUpdatedState from 'lib/hooks/useUpdatedState';

export default function useShallowMemoObject<T extends ObjectOf<any>>(
  obj: T,
) {
  return useUpdatedState(
    obj as Memoed<T>,
    prevObj => {
      const curKeys = Object.keys(obj);
      const prevKeys = Object.keys(prevObj);

      if (curKeys.length !== prevKeys.length) {
        return obj as Memoed<T>;
      }
      for (const k of curKeys) {
        if (obj[k] !== prevObj[k]) {
          return obj as Memoed<T>;
        }
      }

      return prevObj;
    },
  );
}
