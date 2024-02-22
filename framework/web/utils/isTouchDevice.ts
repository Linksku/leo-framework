let cache: boolean | undefined;

export default function isTouchDevice() {
  if (cache == null) {
    cache = window.matchMedia('(hover: none)').matches;
  }
  return cache;
}
