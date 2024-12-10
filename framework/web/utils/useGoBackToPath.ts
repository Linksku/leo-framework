export default function useGoBackToPath() {
  const { backStates } = useNavState();

  return useCallback((
    path: string | RegExp,
    {
      limit = 3,
      breakOnPath,
    }: {
      limit?: number,
      breakOnPath?: string | RegExp
    } = {},
  ): boolean => {
    for (const [idx, state] of backStates.entries()) {
      if (idx >= limit) {
        return false;
      }
      if ((typeof breakOnPath === 'string' && state.path === breakOnPath)
        || (breakOnPath instanceof RegExp && breakOnPath.test(state.path))) {
        return false;
      }
      if ((typeof path === 'string' && state.path === path)
        || (path instanceof RegExp && path.test(state.path))) {
        window.history.go(-idx - 1);
        return true;
      }
    }
    return false;
  }, [backStates]);
}
