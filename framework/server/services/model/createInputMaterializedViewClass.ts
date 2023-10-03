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
> = Omit<MaterializedViewConfig<Type, StaticProps, Props>, 'MVQueryDeps'>
  & {
    MVQueryDeps: never,
  }
  & InputMaterializedViewConfigStaticProps;

export function processInputMaterializedViewConfig<
  Config extends InputMaterializedViewConfig<ModelType>,
>({
  BTClass,
  ...config
}: Config): Pick<Config, keyof MaterializedViewConfig<any>> & {
  MVQueryDeps: ModelClass[],
} {
  if (BTClass == null) {
    throw new Error(`processInputMaterializedViewConfig(${config.type}): missing BTClass.`);
  }

  return {
    ...config,
    MVQueryDeps: [BTClass],
    staticProps: {
      BTClass,
      ...config.staticProps,
    },
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
