const cache: Map<string, URLSearchParams | null> = new Map();

export default function getUrlParams(_search?: string): URLSearchParams {
  const search = _search ?? window.location.search;
  if (!cache.has(search)) {
    cache.set(search, new URLSearchParams(search));
  }
  return cache.get(search) as URLSearchParams;
}
