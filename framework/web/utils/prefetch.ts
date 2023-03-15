export function prefetchImage(url: string) {
  const img = new Image();
  img.src = url;
}

export function prefetchVideo(_url: string) {
  // todo: low/mid prefetch video for cache
}
