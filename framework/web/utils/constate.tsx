// Slightly modified from Constate: https://github.com/diegohaz/constate
// constate(useCounter, value => value.count)
//                      ^^^^^^^^^^^^^^^^^^^^
type Selector<Value> = (value: Value) => any;

// const [Provider, useCount, useIncrement] = constate(...)
//                  ^^^^^^^^^^^^^^^^^^^^^^
type SelectorHooks<Selectors> = {
  [K in keyof Selectors]: <T extends boolean | undefined = undefined>(allowNoProvider?: T)
    => Selectors[K] extends (...args: any) => infer R
      ? R | (T extends true ? undefined : never)
      : never;
};

// const [Provider, useCounterContext] = constate(...)
// or               ^^^^^^^^^^^^^^^^^
// const [Provider, useCount, useIncrement] = constate(...)
//                  ^^^^^^^^^^^^^^^^^^^^^^
type Hooks<
  Value,
  Selectors extends Selector<Value>[],
> = Selectors['length'] extends 0
  ? [<T extends boolean | undefined = undefined>(allowNoProvider?: T)
      => Value | (T extends true ? undefined : never)]
  : SelectorHooks<Selectors>;

// const [Provider, useContextValue] = constate(useValue)
//       ^^^^^^^^^^^^^^^^^^^^^^^^^^^
type ConstateTuple<Props, Value, Selectors extends Selector<Value>[]> = [
  React.FC<React.PropsWithChildren<Props>>,
  ...Hooks<Value, Selectors>,
];

const isDev = process.env.NODE_ENV !== 'production';

const NO_PROVIDER = {};

function createUseContext(context: React.Context<any>): any {
  return (allowNoProvider?: boolean) => {
    const value = React.useContext(context);
    if (value === NO_PROVIDER) {
      const warnMessage = context.displayName
        ? `The context consumer of ${context.displayName} must be wrapped with its corresponding Provider`
        : 'Component must be wrapped with Provider.';
      if (allowNoProvider) {
        return undefined;
      }
      throw new Error(warnMessage);
    }
    return value;
  };
}

function constate<Props, Value, Selectors extends Selector<Value>[]>(
  useValue: (props: Props) => Value,
  ...selectors: Selectors
): ConstateTuple<Props, Stable<Value>, Selectors> {
  const contexts = [] as React.Context<any>[];
  const hooks = ([] as unknown) as Hooks<Stable<Value>, Selectors>;

  const createContext = (displayName: string) => {
    const context = React.createContext(NO_PROVIDER);
    if (isDev && displayName) {
      context.displayName = displayName;
    }
    contexts.push(context);
    hooks.push(createUseContext(context));
  };

  if (selectors.length) {
    for (const selector of selectors) {
      createContext(selector.name);
    }
  } else {
    createContext(useValue.name);
  }

  const Provider: React.FC<React.PropsWithChildren<Props>> = ({
    children,
    ...props
  }) => {
    const value = useValue(props as Props);
    let element = children as React.ReactElement;
    for (let i = 0; i < contexts.length; i += 1) {
      const Context = contexts[i];
      const selector = selectors[i] || (v => v);
      element = (
        <Context.Provider value={selector(value)}>{element}</Context.Provider>
      );
    }
    return element;
  };

  if (isDev && useValue.name) {
    Provider.displayName = 'Constate';
  }

  return [Provider, ...hooks];
}

export default constate;
