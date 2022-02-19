import throttle from 'lib/throttle';

export default function useWindowSize() {
  const [state, setState] = useState({
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
  }, []);

  return state;
}
