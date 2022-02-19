import omit from 'lodash/omit';

import type { ModelConfig } from './createModelClass';
import type { MergeConfigUnion, ModelConfigArrHack } from './modelHelperTypes';
import BaseBTEntity from './BTEntity';
import composeModelConfigs from './composeModelConfigs';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type BTClassConfigStaticProps = { MVType: EntityType };

export type BTClassConfig<
  Type extends EntityType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  StaticProps extends ObjectOf<any> = {},
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props extends ObjectOf<any> = {}
> = ModelConfig<Type, StaticProps, Props>
  & BTClassConfigStaticProps;

export function processBTClassConfig<Config extends BTClassConfig<EntityType>>(
  config: Config,
): Pick<Config, keyof ModelConfig<any>> & {
  staticProps: Pick<Config, 'MVType'>,
} {
  if (config.uniqueIndexes && !config.uniqueIndexes.includes('id')) {
    throw new Error(`processBTClassConfig(${config.type}): id required in uniqueIndexes.`);
  }
  if (config.schema.version?.type !== 'integer') {
    throw new Error(`processBTClassConfig(${config.type}): missing schema for "version".`);
  }

  return {
    ...omit(config, 'MVType'),
    staticProps: {
      MVType: config.MVType,
      ...config.staticProps,
    },
  };
}

export default function createBTEntityClass<
  Config extends MergeConfigUnion<T extends any ? Omit<T, OptionalKeys<T>> : never>,
  Arr extends (Partial<BTClassConfig<EntityType>>
    | ((config: Partial<BTClassConfig<any>>) => Partial<BTClassConfig<EntityType>>))[],
  T extends ValOrFunctionRet<Arr[number]>
>(
  ...configs: Arr & ModelConfigArrHack<Config, BTClassConfig<any>, AllKeys<T>>
) {
  const config = composeModelConfigs([
    { staticProps: {}, props: {} },
    ...configs,
  ]);

  return buildClass(
    processModelConfig(processBTClassConfig(
      config as Config & BTClassConfig<EntityType>,
    )),
    BaseBTEntity,
  );
}
