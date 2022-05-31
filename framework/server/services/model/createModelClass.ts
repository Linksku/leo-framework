import pick from 'lodash/pick';
import omit from 'lodash/omit';

import ucFirst from 'utils/ucFirst';
import type { RelationsConfig } from './helpers/modelRelations';
import type { BuildClassConfig } from './buildClass';

type ModelConfigStaticProps<Type> = {
  type: Type,
  cacheable?: boolean,
  schema: ObjectOf<any>,
  jsonAttributes?: string[],
  uniqueIndexes?: (string | string[])[],
  normalIndexes?: (string | string[])[],
  expressionIndexes?: string[],
  relations?: RelationsConfig,
};

const HANDLED_STATIC_PROPS = [
  'type',
  'cacheable',
  'schema',
  'jsonAttributes',
  'uniqueIndexes',
  'normalIndexes',
  'expressionIndexes',
  'relations',
] as const;

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

// todo: mid/hard speed up TS by maybe generating classes
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
  Config['props'] & ModelTypeToInterface<Config['type']>
> {
  if (!/^[a-z][\dA-Za-z]+$/.test(config.type)) {
    throw new Error(`processMaterializedViewConfig(${config.type}): invalid type.`);
  }
  if (!config.uniqueIndexes?.length) {
    throw new Error(`processModelConfig(${config.type}): unique index is required.`);
  }

  const unhandledConfig = omit(config, [
    ...HANDLED_STATIC_PROPS,
    'staticProps',
    'props',
  ]);
  if (Object.keys(unhandledConfig).length) {
    throw new Error(`processModelConfig(${config.type}): unhandled config: ${Object.keys(unhandledConfig).join(', ')}`);
  }

  return {
    name: ucFirst(config.type) as Capitalize<Config['type']>,
    staticProps: {
      ...pick(config, HANDLED_STATIC_PROPS),
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
      ...({} as ModelTypeToInterface<Config['type']>),
    },
  };
}
