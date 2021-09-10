import HomeSvg from '@fortawesome/fontawesome-free/svgs/solid/home.svg';

export const ICON_COMPONENTS = {
  home: HomeSvg,
} as const;

export const SMALL_ICONS = new Set([]);

export function useShowHomeFooter() {
  return true;
}
