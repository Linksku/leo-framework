import equal from 'fast-deep-equal';

import useUpdatedState from 'lib/hooks/useUpdatedState';

type DeepMemoableObj = Partial<{
  [k: string]: MemoedTypes | Pojo | ReadonlyArray<MemoedTypes | Pojo>
}>;

export default function useDeepMemoObj<
  T extends DeepMemoableObj
>(
  obj: T,
) {
  // todo: low/mid in dev mode, check deep memo obj size and how often this updates
  return useUpdatedState(
    obj,
    s => (equal(obj, s) ? s : obj),
  ) as MemoDeep<T>;
}
