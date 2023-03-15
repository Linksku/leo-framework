import omit from 'lodash/omit';

import type { ModelConfig } from './createModelClass';
import BaseEntity from './Entity';
import composeModelConfigs from './helpers/composeModelConfigs';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type EntityClassConfigStaticProps = {
  useInsertOnlyPublication?: boolean,
  skipColumnsForMZ?: string[],
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
  if (config.uniqueIndexes && config.uniqueIndexes[0] !== 'id') {
    throw new Error(`processEntityClassConfig(${config.type}): primary index isn't id.`);
  }
  if (config.schema.id?.type !== 'integer') {
    throw new Error(`processEntityClassConfig(${config.type}): missing schema for "id".`);
  }

  return {
    ...omit(config, [
      'indexesNotInRR',
      'skipColumnsForMZ',
      'useInsertOnlyPublication',
    ]),
    uniqueIndexes: config.uniqueIndexes ?? ['id'],
    staticProps: {
      indexesNotInRR: config.indexesNotInRR ?? [],
      skipColumnsForMZ: config.skipColumnsForMZ ?? [],
      useInsertOnlyPublication: config.useInsertOnlyPublication,
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
