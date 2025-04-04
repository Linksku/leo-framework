const updateReducer = (num: number): number => (num + 1) % Number.MAX_SAFE_INTEGER;

export default function useUpdate(): Stable<() => void> {
  const [_, update] = useReducer(updateReducer, 0);
  return update;
}
