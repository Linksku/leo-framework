import type HOME_TABS from 'config/homeTabs';

export const ICONS_CONFIG = [] as {
  key: ValueOf<typeof HOME_TABS>,
  RegularIcon: React.SVGFactory,
  FilledIcon: React.SVGFactory,
  isSmall?: boolean,
}[];

export function useHomeFooterShown() {
  return true;
}
