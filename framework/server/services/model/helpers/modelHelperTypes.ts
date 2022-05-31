type PickType<T, K extends PropertyKey> = T extends { [k in K]?: any }
  ? T[K]
  : undefined;

export type MergeConfigUnion<T, T2=T> = UnionToIntersection<{
  [K in keyof T]: T[K] extends (infer U)[]
    ? PickType<T2, K> extends any[]
        ? (U | PickType<T2, K>[number])[]
        : T[K]
    : T[K];
}>
  // eslint-disable-next-line @typescript-eslint/ban-types
  & { staticProps: {}, props: {} };

export type ExpandConfig<T> = T extends Primitive ? T
  : T extends BuiltInObjects ? T
  : T extends ModelClass ? T
  : T extends Model ? T
  : T extends QueryBuilder<any> ? T
  : T extends infer O ? {
    [K in keyof O]: K extends 'schema' | 'relations' | 'MVQuery' | 'MVQueryDeps'
      ? O[K]
      : ExpandConfig<O[K]>;
  } : never;

export type ModelConfigArrHack<Config, FullConfig, AllKeys extends keyof FullConfig> =
  (Pick<FullConfig, AllKeys> extends FullConfig
    ? unknown
    : (Omit<FullConfig, keyof Config | 'staticProps' | 'props'> & Partial<Pick<
        FullConfig,
        // @ts-ignore wontfix key error
        keyof Config
      >>)
      | ((config: Partial<FullConfig>)
        => Omit<FullConfig, keyof Config | 'staticProps' | 'props'> & Partial<Pick<
          FullConfig,
          // @ts-ignore wontfix key error
          keyof Config
        >>)
  )[];
