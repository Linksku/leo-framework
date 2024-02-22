export default [] as [
  RouteConfig['pattern'],
  (() => Promise<{ default: React.ComponentType<any> | React.NamedExoticComponent<any> }>),
  Omit<
    RouteConfig,
    'pattern' | 'importComponent' | 'getComponent' | 'regexPrefix'
  >?,
][];
