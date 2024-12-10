import { useLocalStorage } from 'utils/useStorage';

const validator = markStable(
  (val: unknown) => val == null || (typeof val === 'string' && val.startsWith('/')),
);

export default function useLoginRedirectPathStorage(newRedirectPath?: string) {
  const [state, setState, resetState] = useLocalStorage<string | null>(
    'loginRedirectPath',
    null,
    validator,
  );

  useEffect(() => {
    if (newRedirectPath) {
      setState(newRedirectPath);
    }
  }, [setState, newRedirectPath]);

  return TS.tuple(state, setState, resetState);
}
