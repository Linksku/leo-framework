type ApiData<Name extends ApiName> = MemoDeep<ApiNameToData[Name]>;

type OnApiFetch<Name extends ApiName> = (
  results: ApiData<Name>,
  params: ApiParams<Name>,
) => void;

type OnApiError = (err: Error) => void;
