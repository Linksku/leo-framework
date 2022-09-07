export default function useCatchAsync() {
  const [_, setState] = useState(null);
  return useCallback(<T>(promise: Promise<T>) => {
    promise.catch(
      err => {
        setState(() => {
          throw err;
        });
      },
    );
  }, []);
}
