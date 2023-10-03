type ApiData<Name extends ApiName> = StableDeep<ApiNameToData[Name]>;

type PaginatedApiRet = {
  items: (string | number)[];
  cursor?: string;
  hasCompleted: boolean;
};

type PaginatedEntitiesApiRet = {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
};
