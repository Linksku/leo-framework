import throttle from 'utils/throttle';

// todo: low/easy make useWindowSize share state/effect across components
export default function useWindowSize() {
  const [state, setState] = useStateStable({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    let raf: number | null = null;
    const handleResize = throttle(
      () => {
        raf = requestAnimationFrame(() => {
          setState({
            width: window.innerWidth,
            height: window.innerHeight,
          });
        });
      },
      { timeout: 100 },
    );

    window.addEventListener('resize', handleResize);

    return () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [setState]);

  return state;
}