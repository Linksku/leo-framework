type EntityApiAction = 'load' | 'create' | 'update' | 'delete';

type ApiParams<Name extends ApiName> = ApiParamsToData<Name>;

type ApiData<Name extends ApiName> = MemoDeep<ApiNameToData[Name]>;

type OnApiFetch<Name extends ApiName> = (
  results: ApiData<Name>,
  params: Partial<ApiParams<Name>>,
) => void;

type OnApiError = (err: Error) => void;
