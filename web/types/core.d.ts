declare module '*.scss' {
  const styles: ObjectOf<string>;
  export default styles;
}

declare module '*.svg' {
  const content: React.SVGFactory;
  export default content;
}

interface Window {
  fetcher: any;
  entities: any;
}

interface Error {
  title?: string;
  status?: number;
}

type HistoryState = Memoed<{
  path: string,
  query: Memoed<ObjectOf<any>> | null,
  queryStr: string | null,
  hash: string | null,
  id: number,
}>;

type RouteProps = {
  matches: string[],
  path: string,
  query: Memoed<ObjectOf<any>> | null,
  queryStr: string | null,
  hash: string | null,
};

type RouteConfig = {
  type?: 'home' | 'stack',
  pattern: string | RegExp,
  Component: React.ComponentType<RouteProps> | React.LazyExoticComponent<RouteProps>,
  auth?: boolean,
};
