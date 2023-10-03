import type { PaginatedApiName } from 'hooks/api/usePaginationApi';
import usePaginationApi from 'hooks/api/usePaginationApi';

import type { PaginatedApiReturn } from 'hooks/api/usePaginationApi';
import type { ListItemRendererProps } from './WindowedInfiniteScrollerColumn';
import WindowedInfiniteScrollerInner, { Props as InnerProps } from './WindowedInfiniteScrollerInner';

type Props<Name extends PaginatedApiName> = {
  apiName: Name,
  apiParams: Stable<ApiParams<Name>>,
  apiRefetchKey?: string,
  maxItems?: number,
  throttleTimeout?: number,
  columns?: number,
} & Omit<
  InnerProps<string | number>,
  keyof PaginatedApiReturn<any>
    | keyof ListItemRendererProps<string | number>
    | 'origItems'
    | 'apiError'
>;

function WindowedInfiniteScroller<
  Name extends PaginatedApiName,
>(
  props: Props<Name>
    & ListItemRendererProps<string | number>
    & { otherItemProps?: undefined },
): ReactElement;

function WindowedInfiniteScroller<
  Name extends PaginatedApiName,
  OtherProps extends ObjectOf<any>,
>(
  props: Props<Name>
    & ListItemRendererProps<string | number, OtherProps>
    & { otherItemProps: Stable<OtherProps> },
): ReactElement;

function WindowedInfiniteScroller<
  Name extends PaginatedApiName,
>({
  apiName,
  apiParams,
  apiRefetchKey,
  throttleTimeout,
  maxItems,
  columns = 1,
  ...props
}: Props<Name> & ListItemRendererProps<string | number>) {
  const {
    items,
    hasCompleted,
    isFirstFetch,
    error,
    fetchNext,
  } = usePaginationApi(apiName, apiParams, {
    refetchKey: apiRefetchKey,
    throttleTimeout,
    maxItems,
  });

  return (
    <WindowedInfiniteScrollerInner
      key={columns}
      columns={columns}
      origItems={items}
      hasCompleted={hasCompleted}
      isFirstFetch={isFirstFetch}
      fetchNext={fetchNext}
      apiError={error}
      {...props}
    />
  );
}

export default WindowedInfiniteScroller;
