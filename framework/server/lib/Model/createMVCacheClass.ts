import omit from 'lodash/omit';

import type { Relations } from './modelRelations';
import type { ModelConfig } from './createModelClass';
import type { MergeConfigUnion, ModelConfigArrHack } from './modelHelperTypes';
import BaseMVCache from './MVCache';
import composeModelConfigs from './composeModelConfigs';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type MVCacheConfigStaticProps = {
  MVQueryDeps: ModelClass[],
  MVQuery: QueryBuilder<Model>,
  extendMVQuery?: ((query: QueryBuilder<Model>) => QueryBuilder<Model>)[],
  relations?: Relations,
};

export type MVCacheConfig<
  Type extends ModelType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  StaticProps extends ObjectOf<any> = {},
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props extends ObjectOf<any> = {}
> = ModelConfig<Type, StaticProps, Props>
  & MVCacheConfigStaticProps;

export function processMVCacheConfig<Config extends MVCacheConfig<ModelType>>(
  config: Config,
): Pick<Config, keyof ModelConfig<any>> {
  return {
    ...omit(config, [
      'MVQueryDeps',
      'MVQuery',
      'extendMVQuery',
      'relations',
    ]),
    staticProps: {
      MVQueryDeps: config.MVQueryDeps,
      MVQuery: config.MVQuery,
      extendMVQuery: config.extendMVQuery,
      relations: config.relations ?? {},
      ...config.staticProps,
    },
  };
}

export default function createMVCacheClass<
  Config extends MergeConfigUnion<T extends any ? Omit<T, OptionalKeys<T>> : never>,
  Arr extends (Partial<MVCacheConfig<ModelType>>
    | ((config: Partial<MVCacheConfig<any>>) => Partial<MVCacheConfig<ModelType>>))[],
  T extends ValOrFunctionRet<Arr[number]>
>(
  ...configs: Arr & ModelConfigArrHack<Config, MVCacheConfig<any>, AllKeys<T>>
) {
  const config = composeModelConfigs([
    { staticProps: {}, props: {} },
    ...configs,
  ]);

  return buildClass(
    processModelConfig(processMVCacheConfig(
      config as Config & MVCacheConfig<ModelType>,
    )),
    BaseMVCache,
  );
}
