let memo: boolean | null = null;

export default function isStandalone() {
  if (memo === null) {
    memo = window.matchMedia('(display-mode: standalone)').matches;
  }
  return memo;
}
