export const ICON_COMPONENTS = {} as ObjectOf<React.SVGFactory>;

export const SMALL_ICONS = new Set<keyof typeof ICON_COMPONENTS>();

export function useShowHomeFooter() {
  return true;
}
