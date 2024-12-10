export default function useCatchAsync() {
  const [_, setState] = useState(null);
  return useCallback(<T>(promise: Promise<T>, ctx?: string) => {
    promise.catch(err => {
      setState(() => {
        throw ctx
          ? getErr(err, { ctx })
          : err;
      });
    });
  }, []);
}
