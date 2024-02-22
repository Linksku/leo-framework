import equal from 'fast-deep-equal';

import type { ApiReturn } from 'hooks/api/useApi';
import { useThrottle } from 'utils/throttle';
import usePrevious from 'hooks/usePrevious';
import type { UseApiOpts } from './useApi';

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
    paginationEntityType,
    ...apiOpts
  }: {
    throttleTimeout?: number,
    maxItems?: number,
  } & Partial<UseApiOpts<Name>>,
): PaginatedApiReturn<Name> {
  const { fetchNextPage } = useApiStore();

  const prevName = usePrevious(apiName);
  const prevParams = usePrevious(apiParams);
  if (!process.env.PRODUCTION && prevName
    && (apiName !== prevName || !equal(apiParams, prevParams))) {
    // todo: low/mid handle api params changing and remove keys on scrollers
    throw getErr(
      `usePaginationApi(${apiName}): api changed`,
      apiName !== prevName
        ? { prevName, apiName }
        : { prevParams, apiParams },
    );
  }

  const {
    data,
    fetching,
    error,
    ...apiState
  } = useApi(
    apiName,
    // TS union type that is too complex to represent
    apiParams as any,
    {
      refetchOnFocus: false,
      refetchOnMount: false,
      refetchIfStale: false,
      ...apiOpts,
      initialCursor,
      paginationEntityType,
      returnState: true,
      isPaginated: true,
    },
  );

  if (!process.env.PRODUCTION && paginationEntityType) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ents = useEntitiesArr(
      paginationEntityType,
      data?.items ?? EMPTY_ARR,
      { allowMissing: true },
    );
    if (data?.items.length && data.items.length !== ents.length) {
      throw getErr(
        `usePaginationApi(${apiName}): missing ${paginationEntityType} ents`,
        { ents, items: data.items },
      );
    }
  }

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
    items: data?.items ?? EMPTY_ARR,
    cursor: data?.cursor ?? null,
    hasCompleted,
    error,
    fetchNext: fetchNextPageThrottled,
  };
}
