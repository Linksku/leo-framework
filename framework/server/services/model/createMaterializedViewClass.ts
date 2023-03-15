import omit from 'lodash/omit';

import type { ModelConfig } from './createModelClass';
import MaterializedView, { MaterializedViewClass } from './MaterializedView';
import composeModelConfigs from './helpers/composeModelConfigs';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type MaterializedViewConfigStaticProps = {
  replicaTable?: Nullish<string>,
  mzIndexes?: (string | string[])[],
  MVQueryDeps: MaterializedViewClass[],
  getMVQuery: () => QueryBuilder<MaterializedView>,
  extendMVQuery?: ((query: QueryBuilder<MaterializedView>) => QueryBuilder<MaterializedView>)[],
};

export type MaterializedViewConfig<
  Type extends ModelType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  StaticProps extends ObjectOf<any> = {},
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props extends ObjectOf<any> = {},
> = ModelConfig<Type, StaticProps, Props>
  & MaterializedViewConfigStaticProps;

export function processMaterializedViewConfig<Config extends MaterializedViewConfig<ModelType>>(
  config: Config,
): Pick<Config, keyof ModelConfig<any>> {
  if (!config.type.endsWith('MV')) {
    throw new Error(`processMaterializedViewConfig(${config.type}): type must end in "MV".`);
  }
  if (config.replicaTable === null) {
    if (config.normalIndexes) {
      throw new Error(`processMaterializedViewConfig(${config.type}): normal indexes not needed if there's no replica table.`);
    }
    if (config.uniqueIndexes && config.uniqueIndexes.length > 1) {
      throw new Error(`processMaterializedViewConfig(${config.type}): multiple unique indexes not needed if there's no replica table.`);
    }
    if (config.cacheable) {
      throw new Error(`processMaterializedViewConfig(${config.type}): cache not needed if there's no replica table.`);
    }
  }

  return {
    ...omit(config, [
      'replicaTable',
      'mzIndexes',
      'MVQueryDeps',
      'getMVQuery',
      'extendMVQuery',
    ]),
    staticProps: {
      replicaTable: config.replicaTable,
      mzIndexes: config.mzIndexes,
      MVQueryDeps: config.MVQueryDeps,
      getMVQuery: config.getMVQuery,
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
