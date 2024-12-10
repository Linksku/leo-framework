import type { PaginatedApiName } from 'stores/api/usePaginationApi';
import usePaginationApi from 'stores/api/usePaginationApi';

import type { PaginationProps } from 'stores/api/usePaginationApi';
import WindowedInfiniteScrollerInner, { InnerProps, ScrollerProps } from './WindowedInfiniteScroller';

type Props<Name extends PaginatedApiName> = {
  apiName: Name,
  apiParams: Stable<ApiParams<Name>>,
  paginationOpts?: PaginationProps,
  columns?: number,
} & Omit<
  ScrollerProps<string | number, any>,
  keyof InnerProps<string | number>
    | 'ItemRenderer'
    | 'otherItemProps'
>;

function WindowedInfiniteScroller<
  Name extends PaginatedApiName,
>(
  props: Props<Name>
    & ScrollerProps<string | number, any>
    & { otherItemProps?: undefined },
): ReactElement;

function WindowedInfiniteScroller<
  Name extends PaginatedApiName,
  OtherProps extends ObjectOf<any>,
>(
  props: Props<Name>
    & Pick<ScrollerProps<string | number, OtherProps>, 'ItemRenderer' | 'otherItemProps'>,
): ReactElement;

function WindowedInfiniteScroller<
  Name extends PaginatedApiName,
>({
  apiName,
  apiParams,
  paginationOpts,
  columns = 1,
  ...props
}: Props<Name>
  & Pick<ScrollerProps<string | number, any>, 'ItemRenderer' | 'otherItemProps'>,
): ReactElement {
  const {
    items,
    hasCompleted,
    isFirstFetch,
    error,
    fetchNext,
  } = usePaginationApi(apiName, apiParams, paginationOpts ?? {});

  return (
    <WindowedInfiniteScrollerInner
      key={columns}
      columns={columns}
      origItems={items}
      isFirstFetch={isFirstFetch}
      hasCompleted={hasCompleted}
      error={error}
      fetchNext={fetchNext}
      {...props}
    />
  );
}

export default WindowedInfiniteScroller;
