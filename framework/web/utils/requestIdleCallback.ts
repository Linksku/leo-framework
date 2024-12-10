export function requestIdleCallback(
  cb: () => void,
  // MDN strongly recommends a timeout
  opts: { timeout: number },
): number {
  if (window.requestIdleCallback) {
    return window.requestIdleCallback(cb, opts);
  }
  return window.setTimeout(cb, 0);
}

export const cancelIdleCallback = window.cancelIdleCallback
  ?? function cancelIdleCallback(id: number) {
    return clearTimeout(id);
  };
