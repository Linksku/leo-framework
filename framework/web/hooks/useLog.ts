export default function useLog(...vals: any[]) {
  useEffect(() => {
    // eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-argument
    console.log(...vals);
  });
}
