declare module '*.scss' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.svg' {
  const content: React.SVGFactory;
  export default content;
}

type HistoryState = Memoed<{
  path: string,
  query: Memoed<ObjectOf<string | string[]>>,
  queryStr: string | null,
  hash: string | null,
  id: number,
}>;

type RouteConfig = Memoed<MemoObjShallow<{
  type?: 'home' | 'stack',
  pattern: string | RegExp,
  Component: React.ComponentType<unknown> | React.LazyExoticComponent<unknown>,
  auth?: boolean,
}>>;
