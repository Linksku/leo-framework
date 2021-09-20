export default function useLogLifecycle(name: string) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(`render ${name}`);
  });

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(`mount ${name}`);

    return () => {
      // eslint-disable-next-line no-console
      console.log(`unmount ${name}`);
    };
  }, [name]);
}
