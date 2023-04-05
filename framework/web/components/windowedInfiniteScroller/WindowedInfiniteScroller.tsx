import type { PaginatedApiName } from 'hooks/useApi/usePaginationApi';
import usePaginationApi from 'hooks/useApi/usePaginationApi';

import type { ListItemRendererProps } from './WindowedInfiniteScrollerColumn';
import WindowedInfiniteScrollerInner, { Props as InnerProps } from './WindowedInfiniteScrollerInner';

type Props<
  Name extends PaginatedApiName,
> = {
  apiName: Name,
  apiParams: Memoed<ApiParams<Name>>,
  apiKey?: string,
  throttleTimeout?: number,
  columns?: number,
} & Omit<
  InnerProps,
  'origItems' | 'addedItems' | 'deletedItems'
    | 'cursor' | 'hasCompleted' | 'fetchingFirstTime' | 'fetchNext'
    | keyof ListItemRendererProps
>;

function WindowedInfiniteScroller<
  Name extends PaginatedApiName,
>(props: Props<Name> & ListItemRendererProps & { otherItemProps?: undefined }): ReactElement;

function WindowedInfiniteScroller<
  Name extends PaginatedApiName,
  OtherProps extends ObjectOf<any>,
>(props: Props<Name>
  & ListItemRendererProps<OtherProps>
  & { otherItemProps: Memoed<OtherProps> }): ReactElement;

function WindowedInfiniteScroller<
  Name extends PaginatedApiName,
>({
  apiName,
  apiParams,
  apiKey,
  throttleTimeout = 1000,
  columns = 1,
  ...props
}: Props<Name> & ListItemRendererProps) {
  const {
    items,
    fetchingFirstTime,
    fetchNext,
    hasCompleted,
    cursor,
  } = usePaginationApi(apiName, apiParams, {
    apiKey,
    throttleTimeout,
  });

  return (
    <WindowedInfiniteScrollerInner
      key={columns}
      origItems={items}
      fetchNext={fetchNext}
      hasCompleted={hasCompleted}
      cursor={cursor}
      fetchingFirstTime={fetchingFirstTime}
      columns={columns}
      {...props}
    />
  );
}

export default WindowedInfiniteScroller;
