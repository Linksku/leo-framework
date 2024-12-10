declare module '*.scss' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.svg' {
  const content: Stable<React.SVGFactory>;
  export default content;
}

interface Window {
  __LAST_POPPED_STATE_ID__: number | null;
}

// Merge with lib.dom.d.ts
interface RequestInit {
  priority?: 'high' | 'low' | 'auto';
}

interface Navigator {
  readonly userAgentData?: {
    readonly brands: {
      readonly brand: string,
      readonly version: string,
    }[],
    readonly mobile: boolean,
    readonly platform: string,
  };

  readonly virtualKeyboard?: {
    overlaysContent: boolean,
    readonly show: () => void,
    readonly hide: () => void,
  };

  readonly standalone?: boolean;
}

interface ScreenOrientation {
  lock?: (
    orientation: 'portrait'
      | 'landscape'
      | 'portrait-primary'
      | 'portrait-secondary'
      | 'landscape-primary'
      | 'landscape-secondary',
  ) => Promise<void>;
}

type HistoryState = Stable<{
  id: number,
  path: string,
  query: Stable<ObjectOf<string | number>>,
  queryStr: string | null,
  hash: string | null,
  key: string,
}>;

type RouteConfig = Stable<{
  pattern: Stable<string | RegExp>,
  importComponent: Stable<() => Promise<{ default: React.ComponentType<unknown> }>>,
  getComponent: Stable<() => React.LazyExoticComponent<React.ComponentType<unknown>>>,
  regexPrefix: string | null,
  homeTab?: string,
  auth?: boolean,
}>;
