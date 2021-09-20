import _useWindowSize from 'react-use/lib/useWindowSize';

export default function useWindowSize(...args: Parameters<typeof _useWindowSize>) {
  return useDeepMemoObj(_useWindowSize(...args));
}
