import ajv from 'services/ajv';

let apis = [] as ApiDefinition<any>[];
let isSorted = true;
export const nameToApi = {} as ObjectOf<ApiDefinition<any>>;

export function defineApi<Name extends ApiName>(
  config: ApiConfig<Name>,
  // Note: need to add ApiHandlerParams manually in handlers for VS Code typing
  handler: ApiHandler<Name>,
) {
  const api = {
    config,
    validateParams: ajv.compile(config.paramsSchema ?? {}),
    ...config.dataSchema && { validateData: ajv.compile(config.dataSchema) },
    handler,
  };
  apis.push(api);
  isSorted = false;
  nameToApi[config.name] = api;
}

export function getApis(): Readonly<ApiDefinition<any>[]> {
  if (!isSorted) {
    apis = apis.sort((a, b) => a.config.name.localeCompare(b.config.name));
  }
  return apis;
}
