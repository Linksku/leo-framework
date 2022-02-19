import omit from 'lodash/omit';

import type { MVEntityConfig } from './createMVEntityClass';
import type { MergeConfigUnion, ModelConfigArrHack } from './modelHelperTypes';
import type BTEntity from './BTEntity';
import BaseMVWithBTEntity from './MVWithBTEntity';
import { processMVEntityConfig } from './createMVEntityClass';
import composeModelConfigs from './composeModelConfigs';
import { processModelConfig } from './createModelClass';
import buildClass from './buildClass';

type MVWithBTEntityConfigStaticProps = {
  BTClass: typeof BTEntity,
  sameAsBT?: boolean,
  MVDefaultCols?: ObjectOf<any>,
  MVOmitCols?: string[],
};

export type MVWithBTEntityConfig<
  Type extends EntityType,
  // eslint-disable-next-line @typescript-eslint/ban-types
  StaticProps extends ObjectOf<any> = {},
  // eslint-disable-next-line @typescript-eslint/ban-types
  Props extends ObjectOf<any> = {}
> = Omit<MVEntityConfig<Type, StaticProps, Props>, 'MVQuery' | 'MVQueryDeps' | 'schema'>
  & Partial<Pick<MVEntityConfig<any>, 'MVQuery' | 'MVQueryDeps' | 'schema'>>
  & MVWithBTEntityConfigStaticProps;

export function processMVWithBTEntityConfig<Config extends MVWithBTEntityConfig<EntityType>>(
  config: Config,
): Pick<Config, keyof MVEntityConfig<any>>
  & Pick<MVEntityConfig<any>, 'MVQuery' | 'MVQueryDeps' | 'schema'>
  & { staticProps: Pick<Config, 'BTClass' | 'MVDefaultCols' | 'MVOmitCols'> } {
  let { BTClass, MVQueryDeps, MVQuery, schema, sameAsBT } = config;
  if (
    !MVQueryDeps
    && !MVQuery
    && !schema
    && !config.jsonAttributes
    && !config.uniqueIndexes
    && !config.normalIndexes
    && sameAsBT !== false
  ) {
    sameAsBT = true;
    MVQueryDeps = [BTClass];
    MVQuery = BTClass.query()
      .select(Object.keys(BTClass.getSchema()));
    schema = BTClass.getSchema();
    config.jsonAttributes = BTClass.jsonAttributes;
    config.uniqueIndexes = BTClass.uniqueIndexes;
    config.normalIndexes = BTClass.normalIndexes;
  } else if (
    !MVQueryDeps
    || !MVQuery
    || !schema
    || sameAsBT
  ) {
    throw new Error(`processMVWithBTEntityConfig(${config.type}): only all or none of schema configs are allowed.`);
  }

  if (schema.version?.type !== 'integer') {
    throw new Error(`processMVWithBTEntityConfig(${config.type}): missing schema for "version".`);
  }

  const MVKeys = Object.keys(schema);
  const BTKeys = new Set([
    ...Object.keys(omit(
      BTClass.getSchema(),
      config.MVOmitCols ?? [],
    )),
    ...Object.keys(config.MVDefaultCols ?? {}),
  ]);
  const missingKeys = MVKeys.filter(k => !BTKeys.has(k));
  if (missingKeys.length) {
    throw new Error(`processMVWithBTEntityConfig(${config.type}): missing defaults for "${missingKeys.join('", "')}"`);
  }

  return {
    ...omit(config, [
      'BTClass',
      'MVDefaultCols',
      'MVOmitCols',
    ]),
    MVQueryDeps,
    MVQuery,
    schema,
    staticProps: {
      BTClass: config.BTClass,
      sameAsBT,
      MVDefaultCols: config.MVDefaultCols ?? {},
      MVOmitCols: config.MVOmitCols ?? [],
      ...config.staticProps,
    },
  };
}

export default function createMVWithBTClass<
  Config extends MergeConfigUnion<T extends any ? Omit<T, OptionalKeys<T>> : never>,
  Arr extends (Partial<MVWithBTEntityConfig<EntityType>>
    | ((config: Partial<MVEntityConfig<any>>) => Partial<MVWithBTEntityConfig<EntityType>>))[],
  T extends ValOrFunctionRet<Arr[number]>
>(
  ...configs: Arr & ModelConfigArrHack<Config, MVWithBTEntityConfig<any>, AllKeys<T>>
) {
  const config = composeModelConfigs([
    { staticProps: {}, props: {} },
    ...configs,
  ]);

  return buildClass(
    processModelConfig(processMVEntityConfig(processMVWithBTEntityConfig(
      config as Config & MVWithBTEntityConfig<EntityType>,
    ))),
    BaseMVWithBTEntity,
  );
}
