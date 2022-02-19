import omit from 'lodash/omit';

import type { Relations } from './modelRelations';
import type { ModelConfig } from './createModelClass';
import type { MergeConfigUnion, ModelConfigArrHack } from './modelHelperTypes';
import BaseMVEntity from './MVEntity';
import composeModelConfigs from './composeModelConfigs';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type MVEntityConfigStaticProps = {
  MVQueryDeps: EntityClass[],
  MVQuery: QueryBuilder<Model>,
  extendMVQuery?: ((query: QueryBuilder<Model>) => QueryBuilder<Model>)[],
  relations?: Relations,
};

export type MVEntityConfig<
  Type extends EntityType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  StaticProps extends ObjectOf<any> = {},
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props extends ObjectOf<any> = {}
> = ModelConfig<Type, StaticProps, Props>
  & MVEntityConfigStaticProps;

export function processMVEntityConfig<Config extends MVEntityConfig<EntityType>>(
  config: Config,
): Pick<Config, keyof ModelConfig<any>> {
  if (config.uniqueIndexes && !config.uniqueIndexes.includes('id')) {
    throw new Error(`processMVEntityConfig(${config.type}): id required in uniqueIndexes.`);
  }
  if (config.schema.id?.type !== 'integer') {
    throw new Error(`processMVEntityConfig(${config.type}): missing schema for "id".`);
  }

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

export default function createMVEntityClass<
  Config extends MergeConfigUnion<T extends any ? Omit<T, OptionalKeys<T>> : never>,
  Arr extends (Partial<MVEntityConfig<EntityType>>
    | ((config: Partial<MVEntityConfig<any>>) => Partial<MVEntityConfig<EntityType>>))[],
  T extends ValOrFunctionRet<Arr[number]>
>(
  ...configs: Arr & ModelConfigArrHack<Config, MVEntityConfig<any>, AllKeys<T>>
) {
  const config = composeModelConfigs([
    { staticProps: {}, props: {} },
    ...configs,
  ]);

  return buildClass(
    processModelConfig(processMVEntityConfig(
      config as Config & MVEntityConfig<EntityType>,
    )),
    BaseMVEntity,
  );
}
