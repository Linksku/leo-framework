import { useLocalStorage } from 'hooks/useStorage';

const validator = markStable(
  (val: unknown) => val === null || (typeof val === 'number' && val > 0),
);

export default function useCurrentUserIdStorage() {
  return useLocalStorage<number | null>(
    'currentUserId',
    null,
    validator,
  );
}
