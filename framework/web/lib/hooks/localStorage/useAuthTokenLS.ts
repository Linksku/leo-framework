import useLocalStorage from 'lib/hooks/useLocalStorage';

const validator = markMemoed((val: unknown) => typeof val === 'string');

export default function useAuthTokenLS() {
  return useLocalStorage<string>(
    'authToken',
    '',
    validator,
    { raw: true },
  );
}
