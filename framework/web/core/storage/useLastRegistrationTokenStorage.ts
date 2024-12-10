import { useLocalStorage } from 'utils/useStorage';

const validator = markStable((val: unknown) => typeof val === 'string' || val === null);

export default function useLastRegistrationTokenStorage() {
  return useLocalStorage<string | null>(
    'lastRegistrationToken',
    null,
    validator,
  );
}
