export default function useLog(...vals: any[]) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(...vals);
  });
}
