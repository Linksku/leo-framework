import { useLocalStorage, nullableIdValidator } from 'utils/useStorage';

export default function useLoggedInAsStorage() {
  return useLocalStorage<IUser['id'] | null>(
    'loggedInAs',
    null,
    nullableIdValidator,
  );
}
