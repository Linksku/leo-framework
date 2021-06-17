import { useThrottle } from 'lib/throttle';

export default function useGeolocation({
  autoStart,
  ...opts
}: PositionOptions & { autoStart: boolean } = { autoStart: false }) {
  const [state, setState] = useState({
    lat: null as number | null,
    lng: null as number | null,
    error: null as GeolocationPositionError | null,
  });
  const ref = useRef({
    mounted: false,
    watchId: null as number | null,
  });

  const handleEvent = useThrottle<any>(
    event => {
      if (ref.current.mounted) {
        setState({
          lat: event.coords.latitude,
          lng: event.coords.longitude,
          error: null,
        });
      }
    },
    { timeout: 10_000 },
  );

  const handleError = (error: GeolocationPositionError) => {
    if (ref.current.mounted) {
      setState(s => (s.error ? s : ({ ...s, error })));
    }
  };

  const startGeolocation = async (opts2?: PositionOptions) => new Promise<{
    lat: number,
    lng: number,
  }>(
    (succ, fail) => {
      window.navigator.geolocation.getCurrentPosition(
        event => {
          handleEvent(event);
          succ({ lat: event.coords.latitude, lng: event.coords.longitude });
        },
        err => {
          handleError(err);
          fail(err);
        },
        opts2 ?? opts,
      );

      ref.current.watchId = window.navigator.geolocation
        .watchPosition(handleEvent, handleError, opts2 ?? opts);
    },
  );

  useEffect(() => {
    if (autoStart) {
      window.navigator.geolocation.getCurrentPosition(handleEvent, handleError, opts);
      ref.current.watchId = window.navigator.geolocation
        .watchPosition(handleEvent, handleError, opts);
    }

    return () => {
      if (ref.current.watchId) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        window.navigator.geolocation.clearWatch(ref.current.watchId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ref.current.mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, ...Object.values(opts)]);

  return {
    ...state,
    startGeolocation,
  };
}
