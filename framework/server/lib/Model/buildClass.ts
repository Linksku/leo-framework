import type BaseModel from './Model';
import type { ExpandConfig } from './modelHelperTypes';

export type BuildClassConfig<
  Name extends string,
  StaticProps extends ObjectOf<any>,
  Props extends ObjectOf<any>
> = {
  name: Name,
  staticProps: StaticProps,
  props: Props,
};

export default function createClass<
  Name extends string,
  StaticProps extends ObjectOf<any>,
  Props extends ObjectOf<any>,
  BaseClassType extends typeof BaseModel
>(
  config: BuildClassConfig<Name, StaticProps, Props>,
  BaseClass: BaseClassType,
) {
  const Cls = class extends BaseClass {
    constructor(..._args: any[]) {
      super();

      for (const [k, v] of Object.entries(config.props)) {
        // @ts-ignore wontfix key error
        this[k] = v.bind(this);
      }
    }
  };

  Object.defineProperty(Cls, 'name', { value: config.name });

  if (config.staticProps) {
    for (const [k, v] of Object.entries(config.staticProps)) {
      // @ts-ignore wontfix key error
      Cls[k] = v;
    }
  }

  type M<_T> = BaseClassType
    & ExpandConfig<StaticProps>
    & {
      new(): InstanceType<BaseClassType> & ExpandConfig<Props>;
    };

  return Cls as unknown as M<Name>;
}
