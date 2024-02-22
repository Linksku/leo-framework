import type { ModelConfig } from './createModelClass';
import BaseEntity from './Entity';
import composeModelConfigs from './helpers/composeModelConfigs';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type EntityClassConfigStaticProps = {
  useInsertOnlyPublication?: boolean,
  skipColumnsForMZ?: string[],
  deleteable?: boolean,
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

export function processEntityClassConfig<Config extends EntityClassConfig<EntityType>>({
  indexesNotInRR,
  skipColumnsForMZ,
  deleteable,
  useInsertOnlyPublication,
  ...config
}: Config): Pick<Config, keyof ModelConfig<any>> {
  if (config.uniqueIndexes && config.uniqueIndexes[0] !== 'id') {
    throw new Error(`processEntityClassConfig(${config.type}): primary index isn't id.`);
  }
  if (config.schema.id?.type !== 'integer') {
    throw new Error(`processEntityClassConfig(${config.type}): missing schema for "id".`);
  }
  if (!deleteable && !config.schema.isDeleted) {
    if (config.type.includes('user')) {
      throw new Error(`processEntityClassConfig(${config.type}): user data must be deleteable.`);
    }

    // todo: low/mid recursively check if related to user model
    for (const key of Object.keys(config.schema)) {
      if (key.includes('user')) {
        throw new Error(`processEntityClassConfig(${config.type}): user data must be deleteable.`);
      }
    }
  }

  return {
    ...config,
    uniqueIndexes: config.uniqueIndexes ?? ['id'],
    staticProps: {
      indexesNotInRR: indexesNotInRR ?? [],
      skipColumnsForMZ: skipColumnsForMZ ?? [],
      deleteable: deleteable ?? false,
      useInsertOnlyPublication,
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
