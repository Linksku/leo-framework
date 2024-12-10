import { useLocalStorage, nonNegIntValidator } from 'utils/useStorage';

export default function useSWVersionStorage() {
  return useLocalStorage<number>(
    'swVersion',
    0,
    nonNegIntValidator,
  );
}
