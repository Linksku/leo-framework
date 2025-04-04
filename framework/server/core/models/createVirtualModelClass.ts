import type { ModelConfig } from './createModelClass';
import VirtualModel from './VirtualModel';
import composeModelConfigs from './helpers/composeModelConfigs';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type VirtualModelConfigStaticProps = {
  idColumn: string,
};

export type VirtualModelConfig<
  Type extends ModelType,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  StaticProps extends ObjectOf<any> = {},
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  Props extends ObjectOf<any> = {},
> = ModelConfig<Type, StaticProps, Props>
  & VirtualModelConfigStaticProps;

export function processVirtualModelConfig<Config extends VirtualModelConfig<ModelType>>({
  idColumn,
  ...config
}: Config): Pick<Config, keyof ModelConfig<any>> {
  if (!config.type.startsWith('virtual')) {
    throw new Error(`processVirtualModelConfig(${config.type}): type must start with "virtual".`);
  }

  if (idColumn == null) {
    throw new Error(`processVirtualModelConfig(${config.type}): missing idColumn.`);
  }
  const idSchema: JsonSchema | undefined = config.schema[idColumn];
  if (!idSchema
    || (idSchema.type !== 'number'
      && idSchema.type !== 'integer'
      && idSchema.type !== 'string')) {
    throw new Error(`processVirtualModelConfig(${config.type}): id column must be number or string`);
  }

  return {
    ...config,
    uniqueIndexes: [idColumn],
    staticProps: {
      idColumn,
      virtualAttributes: [
        ...VirtualModel.virtualAttributes,
        ...Object.keys(config.schema),
      ],
      ...config.staticProps,
    },
  };
}

export default function createVirtualModelClass<T extends ModelType>(
  ...configs: (Partial<VirtualModelConfig<T>>
    | ((config: Partial<VirtualModelConfig<any>>) => Partial<VirtualModelConfig<T>>))[]
): ModelTypeToClass<T> {
  const config = composeModelConfigs([
    { staticProps: {}, props: {} },
    ...configs,
  ]);

  return buildClass(
    processModelConfig(processVirtualModelConfig(
      config as any,
    )),
    VirtualModel,
  );
}
