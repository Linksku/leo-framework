import equal from 'fast-deep-equal';

import useUpdatedState from 'lib/hooks/useUpdatedState';

export default function useDeepMemoObj<T extends ObjectOf<any>>(obj: T) {
  // todo: low/mid in dev mode, check deep memo obj size and how often this updates
  return useUpdatedState(
    obj,
    s => (equal(obj, s) ? s : obj),
  ) as MemoDeep<T>;
}
