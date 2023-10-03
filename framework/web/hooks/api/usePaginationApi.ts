import equal from 'fast-deep-equal';

import type { ApiReturn } from 'hooks/api/useApi';
import { useThrottle } from 'utils/throttle';
import usePrevious from 'hooks/usePrevious';
import type { ApiOpts } from './useApi';

export type PaginatedApiName = {
  [Name in ApiName]: ApiNameToData[Name] extends PaginatedApiRet
    ? Name
    : never;
}[ApiName];

export type PaginatedEntitiesApiName = {
  [Name in ApiName]: ApiNameToData[Name] extends PaginatedEntitiesApiRet
    ? Name
    : never;
}[ApiName];

export type PaginatedApiReturn<Name extends ApiName> = Omit<ApiReturn<Name>, 'data'>
  & {
    items: Stable<(string | number)[]>,
    hasCompleted: boolean,
    cursor: string | null,
    fetchNext: Stable<() => void>,
};

export default function usePaginationApi<
  Name extends PaginatedApiName,
>(
  apiName: Name,
  apiParams: Stable<ApiParams<Name>>,
  {
    throttleTimeout = 500,
    // Note: could have more than maxItems if first page has few items or if ents were created
    maxItems,
    initialCursor,
    ...apiOpts
  }: {
    throttleTimeout?: number,
    maxItems?: number,
  } & Partial<ApiOpts<Name>>,
): PaginatedApiReturn<Name> {
  const { fetchNextPage } = useApiStore();

  const prevName = usePrevious(apiName);
  const prevParams = usePrevious(apiParams);
  if (!process.env.PRODUCTION && prevName
    && (apiName !== prevName || !equal(apiParams, prevParams))) {
    if (apiName !== prevName) {
      // eslint-disable-next-line no-console
      console.log(prevName, apiName);
    } else {
      // eslint-disable-next-line no-console
      console.log(prevParams, apiParams);
    }
    // todo: low/mid handle api params changing and remove keys on scrollers
    throw new Error(`usePaginationApi(${apiName}): api changed`);
  }

  const {
    data,
    fetching,
    error,
    ...apiState
  } = useApi(
    apiName,
    // @ts-ignore apiParams hack
    apiParams,
    {
      refetchOnFocus: false,
      refetchOnMount: false,
      refetchIfStale: false,
      ...apiOpts,
      initialCursor,
      returnState: true,
      isPaginated: true,
    },
  );

  const hasCompleted = !!(data?.hasCompleted
    || (maxItems && data?.items && data.items.length >= maxItems));
  const fetchNextPageThrottled = useThrottle(
    () => {
      if (!hasCompleted || error) {
        // todo: low/mid maybe make fetchNextPage return a promise
        fetchNextPage(apiName, apiParams, initialCursor);
      }
    },
    useMemo(() => ({
      timeout: throttleTimeout,
      disabled: fetching,
    }), [throttleTimeout, fetching]),
    [],
  );

  return {
    ...apiState,
    fetching,
    items: (data?.items ?? EMPTY_ARR) as Stable<(string | number)[]>,
    cursor: data?.cursor ?? null,
    hasCompleted,
    error,
    fetchNext: fetchNextPageThrottled,
  };
}
