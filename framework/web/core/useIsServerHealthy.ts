import useTimeout from 'utils/useTimeout';

export default function useIsServerHealthy(): boolean | null {
  const { refetch } = useApiStore();
  const { data } = useApi(
    'status',
    EMPTY_OBJ,
    {
      returnState: true,
    },
  );

  useTimeout(
    useCallback(() => {
      refetch('status', EMPTY_OBJ);
    }, [refetch]),
    data?.isHealthy === false
      ? 15 * 1000
      : 60 * 1000,
  );

  return data?.isHealthy ?? null;
}
