export default function useLog(val: any) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(val);
  });
}
