import { mutate } from 'swr';

export default function useMutateApiCache<Name extends ApiName>(
  name: Name,
) {
  return useCallback((
    data: ApiNameToData[Name],
    params: ApiParams<Name>,
  ) => {
    mutate(
      [name, JSON.stringify(params)],
      data,
      false,
    );
  }, [name]);
}
