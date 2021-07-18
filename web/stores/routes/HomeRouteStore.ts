const [
  HomeRouteProvider,
  useHomeRouteStore,
] = constate(
  function HomeRouteStore() {
    const [sidebarShown, setSidebarShown] = useState(false);

    return useDeepMemoObj({
      sidebarShown,
      setSidebarShown,
    });
  },
);

export { HomeRouteProvider, useHomeRouteStore };
