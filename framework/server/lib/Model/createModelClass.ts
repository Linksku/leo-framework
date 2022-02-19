import pick from 'lodash/pick';

import ucFirst from 'lib/ucFirst';
import type { MergeConfigUnion, ModelConfigArrHack } from './modelHelperTypes';
import type { BuildClassConfig } from './buildClass';
import composeModelConfigs from './composeModelConfigs';
import buildClass from './buildClass';
import BaseModel from './Model';

type ModelConfigStaticProps<Type> = {
  type: Type,
  tableName: string,
  cacheable?: boolean,
  schema: ObjectOf<any>,
  jsonAttributes?: string[],
  uniqueIndexes?: (string | string[])[],
  normalIndexes?: (string | string[])[],
};

export type ModelConfig<
  Type extends ModelType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  StaticProps extends ObjectOf<any> = {},
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props extends ObjectOf<any> = {}
> = {
  staticProps: StaticProps,
  props: Props,
} & ModelConfigStaticProps<Type>;

export function processModelConfig<
  Config extends ModelConfig<ModelType>
>(config: Config): BuildClassConfig<
  Capitalize<Config['type']>,
  Config['staticProps']
    & Pick<Config, 'type'>
    & {
      Interface: ModelTypeToInterface<Config['type']>,
      schema: ModelSchema<ModelTypeToInterface<Config['type']>>,
      cols: ModelColsMap<ModelTypeToInterface<Config['type']>>,
      colsQuoted: ModelColsMap<ModelTypeToInterface<Config['type']>>,
    },
  Config['props'] & DeepReadonly<ModelTypeToInterface<Config['type']>>
> {
  return {
    name: ucFirst(config.type) as Capitalize<Config['type']>,
    staticProps: {
      ...pick(config, [
        'type',
        'tableName',
        'cacheable',
        'schema',
        'jsonAttributes',
        'uniqueIndexes',
        'normalIndexes',
      ]),
      ...config.staticProps,
      ...({} as {
        Interface: ModelTypeToInterface<Config['type']>,
        schema: ModelSchema<ModelTypeToInterface<Config['type']>>,
        cols: ModelColsMap<ModelTypeToInterface<Config['type']>>,
        colsQuoted: ModelColsMap<ModelTypeToInterface<Config['type']>>,
       }),
    },
    props: {
      ...config.props,
      ...({} as DeepReadonly<ModelTypeToInterface<Config['type']>>),
    },
  };
}

export default function createModel<
  Config extends MergeConfigUnion<T extends any ? Omit<T, OptionalKeys<T>> : never>,
  Arr extends (Partial<ModelConfig<ModelType>>
    | ((config: Partial<ModelConfig<any>>) => Partial<ModelConfig<ModelType>>))[],
  T extends ValOrFunctionRet<Arr[number]>
>(
  ...configs: Arr & ModelConfigArrHack<Config, ModelConfig<any>, AllKeys<T>>
) {
  const config = composeModelConfigs([
    { staticProps: {}, props: {} },
    ...configs,
  ]);

  return buildClass(
    processModelConfig(
      config as Config & ModelConfig<ModelType>,
    ),
    BaseModel,
  );
}
