import equal from 'fast-deep-equal';

import useUpdatedState from 'lib/hooks/useUpdatedState';

export default function useDeepMemoObj<T extends ObjectOf<any>>(
  obj: T,
) {
  // todo: low/mid in dev mode, check deep memo obj size
  return useUpdatedState(
    obj as Memoed<T>,
    s => (equal(obj, s) ? s : obj as Memoed<T>),
  );
}
