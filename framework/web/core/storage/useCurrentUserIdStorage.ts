import { useLocalStorage, nullableIdValidator } from 'utils/useStorage';

export default function useCurrentUserIdStorage() {
  return useLocalStorage<IUser['id'] | null>(
    'currentUserId',
    null,
    nullableIdValidator,
  );
}
