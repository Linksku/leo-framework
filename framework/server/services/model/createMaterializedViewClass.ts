import omit from 'lodash/omit';

import type { ModelConfig } from './createModelClass';
import MaterializedView, { MaterializedViewClass } from './MaterializedView';
import composeModelConfigs from './helpers/composeModelConfigs';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type MaterializedViewConfigStaticProps = {
  replicaTable?: Nullish<string>,
  MVQueryDeps: MaterializedViewClass[],
  MVQuery: QueryBuilder<MaterializedView>,
  extendMVQuery?: ((query: QueryBuilder<MaterializedView>) => QueryBuilder<MaterializedView>)[],
};

export type MaterializedViewConfig<
  Type extends ModelType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  StaticProps extends ObjectOf<any> = {},
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props extends ObjectOf<any> = {}
> = ModelConfig<Type, StaticProps, Props>
  & MaterializedViewConfigStaticProps;

export function processMaterializedViewConfig<Config extends MaterializedViewConfig<ModelType>>(
  config: Config,
): Pick<Config, keyof ModelConfig<any>> {
  if (!config.type.endsWith('MV')) {
    throw new Error(`processMaterializedViewConfig(${config.type}): type must end in "MV".`);
  }
  if (config.replicaTable === null && config.normalIndexes) {
    throw new Error(`processMaterializedViewConfig(${config.type}): normal indexes not needed if there's no replica table.`);
  }

  return {
    ...omit(config, [
      'replicaTable',
      'MVQueryDeps',
      'MVQuery',
      'extendMVQuery',
    ]),
    staticProps: {
      replicaTable: config.replicaTable,
      MVQueryDeps: config.MVQueryDeps,
      MVQuery: config.MVQuery,
      extendMVQuery: config.extendMVQuery,
      ...config.staticProps,
    },
  };
}

export default function createMaterializedViewClass<T extends ModelType>(
  ...configs: (Partial<MaterializedViewConfig<T>>
    | ((config: Partial<MaterializedViewConfig<any>>) => Partial<MaterializedViewConfig<T>>))[]
): ModelTypeToClass<T> {
  const config = composeModelConfigs([
    { staticProps: {}, props: {} },
    ...configs,
  ]);

  return buildClass(
    processModelConfig(processMaterializedViewConfig(
      config as any,
    )),
    MaterializedView,
  ) as unknown as ModelTypeToClass<T>;
}
