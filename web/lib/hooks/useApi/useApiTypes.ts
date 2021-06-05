export type EntityApiTypes = 'load' | 'create' | 'update' | 'delete';

// todo: mid/mid remove useCallback and always use the latest callback
export type OnFetchType<Name extends ApiName> = Memoed<
  (results: ApiNameToData[Name], params: Partial<ApiNameToParams[Name]>) => void
>;

export type OnErrorType = Memoed<(err: Error) => void>;
