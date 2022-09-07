declare module '*.scss' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.svg' {
  const content: Memoed<React.SVGFactory>;
  export default content;
}

// Merge with lib.dom.d.ts
interface RequestInit {
  priority?: 'high' | 'low' | 'auto';
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
  type?: 'home' | 'stack',
  pattern: string | RegExp,
  Component: React.ComponentType<unknown> | React.LazyExoticComponent<unknown>,
  auth?: boolean,
  disableBackSwipe?: boolean,
}>>;
