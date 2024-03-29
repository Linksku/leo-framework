import { useLocalStorage } from 'hooks/useStorage';

const validator = markStable((val: unknown) => typeof val === 'number');

export default function useSWVersionStorage() {
  return useLocalStorage<number>(
    'swVersion',
    0,
    validator,
  );
}
