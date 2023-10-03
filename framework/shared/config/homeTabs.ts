export const HOME_TABS = {
  FEED: 'feed',
} as const;

export type HomeTab = Expand<ValueOf<typeof HOME_TABS>>;

export const DEFAULT_PATH_PARTS: string[] = [HOME_TABS.FEED];
