const routes = [
  {
    type: 'home',
    pattern: '/',
    Component: React.lazy(async () => import(/* webpackChunkName: 'HomeRoute' */ '../routes/HomeFeedRoute')),
  },
];

export default routes as Memoed<(typeof routes)[number]>[];
