import type { HomeTab } from 'config/homeTabs';

export default function usePushHome() {
  const pushPath = usePushPath();

  return useCallback((
    newHomeTab: HomeTab,
    ...newParts: string[]
  ) => {
    let newPath = `/${newHomeTab}`;
    if (newParts.length) {
      newPath += `/${newParts.join('/')}`;
    } else if (newHomeTab === HOME_TABS.FEED) {
      newPath = '/';
    }

    pushPath(newPath);
  }, [pushPath]);
}
