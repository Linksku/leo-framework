import omit from 'lodash/omit';

import type { MaterializedViewConfig } from './createMaterializedViewClass';
import BaseInputMaterializedView from './InputMaterializedView';
import composeModelConfigs from './helpers/composeModelConfigs';
import { processMaterializedViewConfig } from './createMaterializedViewClass';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type InputMaterializedViewConfigStaticProps = {
  BTClass: EntityClass,
};

export type InputMaterializedViewConfig<
  Type extends ModelType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  StaticProps extends ObjectOf<any> = {},
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props extends ObjectOf<any> = {},
> = SetOptional<MaterializedViewConfig<Type, StaticProps, Props>, 'MVQueryDeps'>
  & InputMaterializedViewConfigStaticProps;

export function processInputMaterializedViewConfig<
  Config extends InputMaterializedViewConfig<ModelType>,
>(
  config: Config,
): Pick<Config, keyof MaterializedViewConfig<any>> & {
    MVQueryDeps: ModelClass[],
    MVQuery: QueryBuilder<Model>,
  } {
  if (config.BTClass == null) {
    throw new Error(`processInputMaterializedViewConfig(${config.type}): missing BTClass.`);
  }

  return {
    ...omit(config, [
      'BTClass',
    ]),
    MVQueryDeps: (config.MVQueryDeps
      ? [...config.MVQueryDeps, config.BTClass]
      : [config.BTClass]),
  };
}

export default function createInputMaterializedViewClass<T extends ModelType>(
  ...configs: (Partial<InputMaterializedViewConfig<T>> | (
    (config: Partial<InputMaterializedViewConfig<any>>) =>
      Partial<InputMaterializedViewConfig<T>>
  ))[]
): ModelTypeToClass<T> {
  const config = composeModelConfigs([
    { staticProps: {}, props: {} },
    ...configs,
  ]);

  return buildClass(
    processModelConfig(processMaterializedViewConfig(processInputMaterializedViewConfig(
      config as any,
    ))),
    BaseInputMaterializedView,
  ) as unknown as ModelTypeToClass<T>;
}
