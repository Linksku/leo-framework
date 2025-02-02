import pick from 'lodash/pick.js';
import omit from 'lodash/omit.js';

import ucFirst from 'utils/ucFirst';
import getNonNullSchema from 'utils/models/getNonNullSchema';
import isSchemaNullable from 'utils/models/isSchemaNullable';
import type { ModelRelationsSpecs } from './modelRelations';
import type { BuildClassConfig } from './buildClass';

type ModelConfigStaticProps<Type> = {
  type: Type,
  cacheable?: boolean,
  schema: ObjectOf<any>,
  jsonAttributes?: string[],
  uniqueIndexes?: (string | string[])[],
  normalIndexes?: (string | string[])[],
  expressionIndexes?: ({
    name?: string,
    cols: string[],
    expression: string,
  } | {
    name?: string,
    col: string,
    expression: string,
  })[],
  mzIndexes?: (string | string[])[],
  relations?: ModelRelationsSpecs,
};

const MODEL_TYPE_REGEX = /^[a-z][\dA-Za-z]+$/;

const HANDLED_STATIC_PROPS = [
  'type',
  'cacheable',
  'schema',
  'jsonAttributes',
  'uniqueIndexes',
  'normalIndexes',
  'expressionIndexes',
  'mzIndexes',
  'relations',
] as const;

export type ModelConfig<
  Type extends ModelType,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  StaticProps extends ObjectOf<any> = {
    virtualAttributes?: string[],
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  Props extends ObjectOf<any> = {},
> = {
  staticProps: StaticProps,
  props: Props,
} & ModelConfigStaticProps<Type>;

export function processModelConfig<
  Config extends ModelConfig<ModelType>,
>(config: Config): BuildClassConfig<
  Capitalize<Config['type']>,
  Config['staticProps']
    & Pick<Config, 'type'>
    & {
      Interface: ModelTypeToInterface<Config['type']>,
      schema: ModelSchema<ModelTypeToInterface<Config['type']>>,
      cols: ModelColsMap<Config['type']>,
      colsQuoted: ModelColsMap<Config['type']>,
    },
  Config['props'] & ModelTypeToInterface<Config['type']>
> {
  if (!MODEL_TYPE_REGEX.test(config.type)) {
    throw new Error(`processMaterializedViewConfig(${config.type}): invalid type.`);
  }
  if (!config.uniqueIndexes?.length) {
    throw new Error(`processModelConfig(${config.type}): 1 unique index is required.`);
  }

  const unhandledConfig = omit(config, [
    ...HANDLED_STATIC_PROPS,
    'staticProps',
    'props',
  ]);
  if (Object.keys(unhandledConfig).length) {
    throw new Error(
      `processModelConfig(${config.type}): unhandled config: ${Object.keys(unhandledConfig).join(', ')}`,
    );
  }

  for (let i = 0; i < config.uniqueIndexes.length; i++) {
    const index = config.uniqueIndexes[i];
    const arr = Array.isArray(index)
      ? index
      : [index];
    for (const col of arr) {
      const colSchema = config.schema[col] as JsonSchema;
      if (!colSchema) {
        throw new Error(`processModelConfig(${config.type}): no schema for "${col}"`);
      }

      // Primary index
      if (i === 0) {
        const combined = [
          ...(colSchema.allOf ?? []),
          ...(colSchema.anyOf ?? []),
          ...(colSchema.oneOf ?? []),
        ];
        if (!combined.length) {
          combined.push(colSchema);
        }

        for (const schema of combined) {
          if (isSchemaNullable(schema)) {
            throw new Error(`processModelConfig(${config.type}): primary index columns can't be nullable`);
          }

          const { nonNullType, nonNullSchema } = getNonNullSchema(schema);
          if (nonNullType !== 'number'
            && nonNullType !== 'integer'
            && nonNullType !== 'string'
            && (!nonNullSchema || (
              typeof nonNullSchema.const !== 'number'
                && typeof nonNullSchema.const !== 'string'
                && typeof nonNullSchema.enum !== 'number'
                && typeof nonNullSchema.enum !== 'string'))
            && !config.staticProps.virtualAttributes?.includes(col)) {
            throw new Error(`processModelConfig(${config.type}): primary index columns must be number or string`);
          }
        }
      }
    }
  }

  if (config.normalIndexes) {
    for (let i = 0; i < config.normalIndexes.length; i++) {
      const index = config.normalIndexes[i];
      const arr = Array.isArray(index)
        ? index
        : [index];
      for (const col of arr) {
        const colSchema = config.schema[col] as JsonSchema;
        if (!colSchema) {
          throw new Error(`processModelConfig(${config.type}): no schema for "${col}"`);
        }
      }
    }
  }

  return {
    name: ucFirst(config.type) as Capitalize<Config['type']>,
    staticProps: {
      ...pick(config, HANDLED_STATIC_PROPS),
      uniqueIndexes: config.uniqueIndexes,
      ...config.staticProps,
      ...({} as {
        Interface: ModelTypeToInterface<Config['type']>,
        schema: ModelSchema<ModelTypeToInterface<Config['type']>>,
        cols: ModelColsMap<Config['type']>,
        colsQuoted: ModelColsMap<Config['type']>,
       }),
    },
    props: {
      ...config.props,
      ...({} as ModelTypeToInterface<Config['type']>),
    },
  };
}
