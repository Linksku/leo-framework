declare module '*.scss' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.svg' {
  const content: Memoed<React.SVGFactory>;
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
}

type HistoryState = Memoed<{
  id: number,
  path: string,
  query: Memoed<ObjectOf<string | string[]>>,
  queryStr: string | null,
  hash: string | null,
  key: string,
}>;

type RouteConfig = Memoed<MemoObjShallow<{
  pattern: string | RegExp,
  Component: React.ComponentType<unknown> | React.LazyExoticComponent<unknown>,
  homeTab?: string,
  auth?: boolean,
  opts?: {
    disableBackSwipe?: boolean,
  },
}>>;
