import deepMergeObjs from 'utils/deepMergeObjs';

export default function composeModelConfigs(
  configs: (ObjectOf<any> | ((config: ObjectOf<any>) => ObjectOf<any>))[],
): ObjectOf<any> {
  let composedConfig: ObjectOf<any> = {};
  for (const _config of configs) {
    const config = typeof _config === 'function' ? _config(composedConfig) : _config;
    composedConfig = deepMergeObjs(composedConfig, config);
  }
  return composedConfig;
}
