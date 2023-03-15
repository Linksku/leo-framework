import { useThrottle } from 'utils/throttle';
import usePrevious from 'utils/hooks/usePrevious';
import shallowEqual from 'utils/shallowEqual';

export type PaginatedApiName = {
  [Name in ApiName]: ApiNameToData[Name] extends {
    items: (string | number)[];
    cursor?: string;
    hasCompleted: boolean;
  }
    ? Name
    : never;
}[ApiName];

export default function usePaginationApi<
  Name extends PaginatedApiName,
>(
  apiName: Name,
  apiParams: Memoed<ApiParams<Name>>,
  {
    apiKey,
    throttleTimeout,
  }: {
    apiKey?: string,
    throttleTimeout?: number,
  } = {},
) {
  const { getApiState, refetch } = useApiStore();
  const [{
    items,
    cursor,
    hasCompleted,
  }, setState] = useState(() => {
    const apiState = getApiState(apiName, apiParams, true);
    return {
      items: apiState.data?.items ?? (EMPTY_ARR as (string | number)[]),
      cursor: undefined as string | undefined,
      nextCursor: apiState.data?.cursor as string | undefined,
      hasCompleted: !!apiState.data && (apiState.data.hasCompleted || !apiState.data.cursor),
    };
  });

  const prevName = usePrevious(apiName);
  const prevParams = usePrevious(apiParams);
  if (!process.env.PRODUCTION && prevName
    && (apiName !== prevName || !shallowEqual(apiParams, prevParams))) {
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

  const fullParams = useMemo(() => ({
    ...apiParams,
    cursor,
  }), [apiParams, cursor]);
  const { fetching, fetchingFirstTime } = useApi(
    apiName,
    fullParams,
    {
      returnState: true,
      // todo: low/mid maybe create a superclass for scroller APIs.
      onFetch(d) {
        setState(s => {
          if (!process.env.PRODUCTION
            && ((new Set(d.items)).size !== d.items.length)) {
            throw new Error(`useEntitiesPaginationApi: duplicate ids in ${apiName}: ${d.items.join(',')}`);
          }

          const newHasCompleted = d.hasCompleted || !d.cursor;
          return d.items.every(i => s.items.includes(i))
            && d.cursor === s.nextCursor
            && newHasCompleted === s.hasCompleted
            ? s
            : ({
              ...s,
              items: d.items.length
                // todo: high/hard after refetching, if new entities were loaded, they have the wrong position
                // e.g. new replies on top instead of bottom
                // also, if order changed, it still shows old order
                ? [...new Set([...s.items, ...d.items])]
                : s.items,
              nextCursor: d.cursor,
              hasCompleted: newHasCompleted,
            });
        });
      },
      onError() {
        // todo: mid/mid retry fetching x times
        setState(s => (s.hasCompleted ? s : { ...s, hasCompleted: true }));
      },
      shouldFetch: !hasCompleted,
      key: apiKey,
    },
  );

  const fetchNext = useThrottle(
    () => {
      setState(s => ({ ...s, cursor: s.nextCursor }));
    },
    useMemo(() => ({
      timeout: throttleTimeout ?? 100,
    }), [throttleTimeout]),
    [],
  );

  const reset = useCallback(() => {
    setState({
      items: EMPTY_ARR,
      cursor: undefined,
      nextCursor: undefined,
      hasCompleted: false,
    });
    refetch(apiName, fullParams);
  }, [refetch, apiName, fullParams]);

  return {
    items,
    fetching,
    fetchingFirstTime,
    fullParams,
    fetchNext,
    hasCompleted,
    cursor,
    reset,
  };
}
