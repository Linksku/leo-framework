import { useLocalStorage } from 'utils/useStorage';

const validator = markStable((val: unknown) => typeof val === 'string');

export default function useAuthTokenStorage() {
  return useLocalStorage<string>(
    'authToken',
    '',
    validator,
  );
}
