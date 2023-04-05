import useLocalStorage from 'hooks/useLocalStorage';

const validator = markMemoed((val: unknown) => typeof val === 'number');

export default function useSWVersionLS() {
  return useLocalStorage<number>(
    'swVersion',
    0,
    validator,
  );
}
