import { getCompiledValidator } from 'routes/apis/apiValidateFn';

export const nameToApi = new Map<string, ApiDefinition<ApiName>>();

export function defineApi<Name extends ApiName>(
  config: ApiConfig<Name>,
  // Note: need to add ApiHandlerParams manually in handlers for VS Code typing
  handler: ApiHandler<Name>,
): void {
  const name = config.name.toLowerCase();
  if (nameToApi.has(name)) {
    throw new Error(`ApiManager.defineApi: ${name} already defined.`);
  }

  const api = {
    config,
    handler,
  } satisfies ApiDefinition<Name>;
  nameToApi.set(
    config.name.toLowerCase(),
    api as unknown as ApiDefinition<ApiName>,
  );

  setTimeout(() => {
    getCompiledValidator(config.paramsSchema);

    if (config.dataSchema) {
      getCompiledValidator(config.dataSchema);
    }
  }, 0);
}

export function getApis(): Readonly<ApiDefinition<any>[]> {
  const apis = [...nameToApi.values()];
  return apis.sort((a, b) => a.config.name.localeCompare(b.config.name));
}
