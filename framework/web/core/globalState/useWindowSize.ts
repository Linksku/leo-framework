export const windowSizeAtom = atom({
  height: window.innerHeight,
  width: window.innerWidth,
});

export default function useWindowSize(): {
  width: number,
  height: number,
  // todo: low/med @typescript-eslint/indent
  } {
  return useAtomValue(windowSizeAtom);
}
