declare module '*.scss' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.svg' {
  const content: Stable<React.SVGFactory>;
  export default content;
}

declare namespace __WebpackModuleApi {
  export interface NodeProcess {
    env: FrameworkEnv;
  }
}

// Merge with lib.dom.d.ts
interface RequestInit {
  priority?: 'high' | 'low' | 'auto';
}

interface Navigator {
  readonly userAgentData?: {
    readonly brands: {
      readonly brand: string;
      readonly version: string;
    }[];
    readonly mobile: boolean;
    readonly platform: string;
  };

  readonly virtualKeyboard?: {
    readonly show: () => void;
    readonly hide: () => void;
  };
}

type HistoryState = Stable<{
  id: number,
  path: string,
  query: Stable<ObjectOf<string | number>>,
  queryStr: string | null,
  hash: string | null,
  key: string,
}>;

type RouteConfig = Stable<StableObjShallow<{
  pattern: string | RegExp,
  importComponent: () => Promise<{ default: React.ComponentType<unknown> }>,
  Component: React.LazyExoticComponent<React.ComponentType<unknown>>,
  regexPrefix: string | null,
  homeTab?: string,
  auth?: boolean,
  opts?: {
    disableBackSwipe?: boolean,
  },
}>>;
