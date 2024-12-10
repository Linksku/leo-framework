import equal from 'fast-deep-equal';

import type { ApiReturn } from 'stores/api/useApi';
import { useThrottle } from 'utils/throttle';
import usePrevious from 'utils/usePrevious';
import useHandleEntityEvents from 'stores/entities/useHandleEntityEvents';
import useUpdate from 'utils/useUpdate';
import type { UseApiOpts } from './useApi';
import type { ShouldAddCreatedEntity } from './ApiStore';

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

export type PaginationProps<T extends EntityType | undefined = undefined> = {
  paginationEntityType?: T,
  shouldAddCreatedEntity?: T extends EntityType ? ShouldAddCreatedEntity<T> : never,
  throttleTimeout?: number,
  maxItems?: number,
  sortItems?: Stable<(a: string | number, b: string | number) => number>,
  sortOnEvents?: Stable<{
    actionType: EntityAction,
    entityType: EntityType,
  }[]>,
} & Partial<Omit<
  UseApiOpts<any>,
  'paginationEntityType' | 'shouldAddCreatedEntity' | 'onFetch' | 'onError'
>>;

export type PaginatedApiReturn = Omit<ApiReturn<any>, 'data'>
  & {
    items: Stable<(string | number)[]>,
    hasCompleted: boolean,
    cursor: string | null,
    fetchNext: Stable<() => void>,
};

export default function usePaginationApi<
  Name extends PaginatedApiName,
  T extends EntityType,
>(
  apiName: Name,
  apiParams: Stable<ApiParams<Name>>,
  {
    throttleTimeout = 500,
    // Note: could have more than maxItems if first page has few items or if ents were created
    maxItems,
    sortItems,
    sortOnEvents,
    initialCursor,
    paginationEntityType,
    ...apiOpts
  }: PaginationProps<T>,
): PaginatedApiReturn {
  const { fetchNextPage } = useApiStore();
  const update = useUpdate();

  const prevName = usePrevious(apiName);
  const prevParams = usePrevious(apiParams);
  if (!process.env.PRODUCTION
    && prevName
    && (apiName !== prevName || !equal(apiParams, prevParams))) {
    // todo: low/mid handle api params changing and remove keys on scrollers
    ErrorLogger.error(new Error(`usePaginationApi(${apiName}): api changed`));
    // eslint-disable-next-line no-console
    console.log(
      ...(apiName !== prevName
        ? ['prevName:', prevName, 'apiName:', apiName]
        : ['prevParams:', prevParams, 'apiParams:', apiParams]),
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
      refetchOnConnect: false,
      refetchOnMount: false,
      refetchIfStale: false,
      ...apiOpts,
      initialCursor,
      paginationEntityType,
      shouldAddCreatedEntity: apiOpts.shouldAddCreatedEntity as ShouldAddCreatedEntity<any>,
      returnState: true,
      isPaginated: true,
    },
  );

  const items = useMemo(() => {
    if (!data || !sortItems) {
      return data?.items ?? EMPTY_ARR;
    }
    return markStable(data.items.slice().sort(sortItems));
  }, [data, sortItems]);

  useHandleEntityEvents(
    sortOnEvents ?? EMPTY_ARR,
    useCallback(() => {
      if (sortItems) {
        update();
      }
    }, [sortItems, update]),
  );

  if (!process.env.PRODUCTION && paginationEntityType) {
    const filteredItems = items.filter(item => !apiState.deletedEntityIds.has(item))
      ?? EMPTY_ARR;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ents = useEntitiesArr(
      paginationEntityType,
      filteredItems,
      { allowMissing: true },
    );
    if (filteredItems.length !== ents.length) {
      throw getErr(
        `usePaginationApi(${apiName}): missing ${paginationEntityType} ents`,
        { ents, items: filteredItems },
      );
    }
  }

  const hasCompleted = !!(data?.hasCompleted
    || (maxItems && items.length >= maxItems));
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
    items,
    cursor: data?.cursor ?? null,
    hasCompleted,
    error,
    fetchNext: fetchNextPageThrottled,
  };
}
