export default function useCatchAsync() {
  const [_, setState] = useState(null);
  return useCallback(<T>(promise: Promise<T>): Promise<T | void> => promise.catch(
    err => {
      setState(() => {
        throw err;
      });
    },
  ), []);
}
