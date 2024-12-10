import type { HomeTab } from 'config/homeTabs';

export default function usePushHome(): Stable<(
  newHomeTab: HomeTab,
  newParts?: string | string[],
  newQuery?: ObjectOf<string | number> | null,
  newHash?: string | null,
) => void> {
  const pushPath = usePushPath();

  return useCallback((
    newHomeTab: HomeTab,
    newParts?: string | string[],
    newQuery: ObjectOf<string | number> | null = null,
    newHash: string | null = null,
  ) => {
    let newPath = `/${newHomeTab}`;
    if (Array.isArray(newParts) && newParts.length) {
      newPath += `/${newParts.join('/')}`;
    } else if (typeof newParts === 'string') {
      newPath += `/${newParts}`;
    } else if (newHomeTab === HOME_TABS.FEED) {
      newPath = '/';
    }

    pushPath(newPath, newQuery, newHash);
  }, [pushPath]);
}
