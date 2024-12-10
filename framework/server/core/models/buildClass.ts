import type BaseModel from './Model';

export type BuildClassConfig<
  Name extends string,
  StaticProps extends ObjectOf<any>,
  Props extends ObjectOf<any>,
> = {
  name: Name,
  staticProps: StaticProps,
  props: Props,
};

export default function createClass<
  Name extends string,
  StaticProps extends ObjectOf<any>,
  Props extends ObjectOf<any>,
  BaseClassType extends typeof BaseModel,
  ClassType = BaseClassType
    & StaticProps
    & {
      new(): InstanceType<BaseClassType> & Props;
    },
>(
  config: BuildClassConfig<Name, StaticProps, Props>,
  BaseClass: BaseClassType,
): ClassType {
  const Cls = class extends BaseClass {
    constructor(..._args: any[]) {
      super();

      for (const [k, v] of Object.entries(config.props)) {
        if (v !== undefined) {
          const val = typeof v === 'function' ? (v as AnyFunction).bind(this) : v;
          // @ts-expect-error wontfix add key
          this[k] = val;
        }
      }
    }
  };

  Object.defineProperty(Cls, 'name', { value: config.name });

  if (config.staticProps) {
    for (const pair of Object.entries(config.staticProps)) {
      if (pair[1] !== undefined) {
        // @ts-expect-error wontfix add key
        Cls[pair[0]] = pair[1];
      }
    }
  }

  return Cls as unknown as ClassType;
}
