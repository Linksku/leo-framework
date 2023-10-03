import { useLocalStorage } from 'hooks/useStorage';

const validator = markStable((val: unknown) => typeof val === 'string');

export default function useAuthTokenLS() {
  return useLocalStorage<string>(
    'authToken',
    '',
    validator,
  );
}
