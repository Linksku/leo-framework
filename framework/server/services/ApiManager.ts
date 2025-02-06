import { DEFAULT_POST_API_TIMEOUT, DEFAULT_API_TIMEOUT } from 'consts/server';
import { getCompiledValidator } from 'routes/apis/apiValidateFn';

export const nameToApi = new Map<
  string,
  ApiDefinition<ApiName> | RawApiDefinition<ApiName>
>();

export function defineApi<Name extends ApiName>(
  config: SetOptional<ApiConfig<Name>, 'timeout'>,
  // Note: need to add ApiHandlerParams manually in handlers for VS Code typing
  handler: ApiHandler<Name>,
): void {
  const name = config.name.toLowerCase();
  if (nameToApi.has(name)) {
    throw new Error(`ApiManager.defineApi: ${name} already defined.`);
  }

  const api = {
    raw: false,
    config: {
      ...config,
      timeout: config.timeout ?? (config.method === 'post' ? DEFAULT_POST_API_TIMEOUT : DEFAULT_API_TIMEOUT),
    },
    handler,
  } satisfies ApiDefinition<Name>;
  nameToApi.set(
    config.name.toLowerCase(),
    api as unknown as ApiDefinition<ApiName>,
  );

  setTimeout(() => {
    getCompiledValidator(config.paramsSchema, `${config.name} params`);

    if (config.dataSchema) {
      getCompiledValidator(config.dataSchema, `${config.name} data`);
    }
  }, 0);
}

export function defineRawApi<Name extends ApiName>(
  config: RawApiConfig<Name>,
  // Note: need to add ApiHandlerParams manually in handlers for VS Code typing
  handler: RawApiHandler,
): void {
  const name = config.name.toLowerCase();
  if (nameToApi.has(name)) {
    throw new Error(`ApiManager.defineApi: ${name} already defined.`);
  }

  const api = {
    raw: true,
    config,
    handler,
  } satisfies RawApiDefinition<Name>;
  nameToApi.set(
    config.name.toLowerCase(),
    api as unknown as RawApiDefinition<ApiName>,
  );
}

export function getApis(): Readonly<ApiDefinition<ApiName>[] | RawApiDefinition<ApiName>[]> {
  const apis = [...nameToApi.values()];
  return apis.sort(
    (a, b) => a.config.name.localeCompare(b.config.name),
  ) as Readonly<ApiDefinition<ApiName>[] | RawApiDefinition<ApiName>[]>;
}
