import useLocalStorage from 'lib/hooks/useLocalStorage';

export default function useAuthTokenLS() {
  return useLocalStorage<string>(
    'authToken',
    '',
    useConst(() => (val: unknown) => typeof val === 'string'),
    { raw: true },
  );
}
