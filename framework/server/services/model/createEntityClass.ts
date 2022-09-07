import omit from 'lodash/omit';

import type { ModelConfig } from './createModelClass';
import BaseEntity from './Entity';
import composeModelConfigs from './helpers/composeModelConfigs';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type EntityClassConfigStaticProps = {
  withInsertOnlyPublication?: boolean,
  indexesNotInRR?: (string | string[])[],
};

export type EntityClassConfig<
  Type extends EntityType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  StaticProps extends ObjectOf<any> = {},
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props extends ObjectOf<any> = {},
> = ModelConfig<Type, StaticProps, Props>
  & EntityClassConfigStaticProps;

export function processEntityClassConfig<Config extends EntityClassConfig<EntityType>>(
  config: Config,
): Pick<Config, keyof ModelConfig<any>> {
  if (config.uniqueIndexes && !config.uniqueIndexes.includes('id')) {
    throw new Error(`processEntityClassConfig(${config.type}): id required in uniqueIndexes.`);
  }
  if (config.schema.version?.type !== 'integer') {
    throw new Error(`processEntityClassConfig(${config.type}): missing schema for "version".`);
  }

  return {
    ...omit(config, [
      'indexesNotInRR',
      'withInsertOnlyPublication',
    ]),
    uniqueIndexes: config.uniqueIndexes ?? ['id'],
    staticProps: {
      indexesNotInRR: config.indexesNotInRR ?? [],
      withInsertOnlyPublication: config.withInsertOnlyPublication,
      ...config.staticProps,
    },
  };
}

export default function createEntityClass<T extends EntityType>(
  ...configs: (Partial<EntityClassConfig<T>>
    | ((config: Partial<EntityClassConfig<any>>) => Partial<EntityClassConfig<T>>))[]
): ModelTypeToClass<T> {
  const config = composeModelConfigs([
    { staticProps: {}, props: {} },
    ...configs,
  ]);

  return buildClass(
    processModelConfig(processEntityClassConfig(
      config as any,
    )),
    BaseEntity,
  ) as unknown as ModelTypeToClass<T>;
}
