import useLocalStorage from 'hooks/useLocalStorage';

const validator = markMemoed((val: unknown) => val === null || (typeof val === 'number' && val > 0));

export default function useCurrentUserIdLS() {
  return useLocalStorage<number | null>(
    'currentUserId',
    null,
    validator,
  );
}
