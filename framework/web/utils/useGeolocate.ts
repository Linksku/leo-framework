import { Geolocation } from '@capacitor/geolocation';

import promiseTimeout from 'utils/promiseTimeout';

export default function useGeolocate(
  onGeolocate: Stable<(lat: number, lng: number) => void>,
) {
  const [geolocating, setGeolocating] = useState(false);

  return TS.tuple(
    geolocating,
    useCallback(async () => {
      if (geolocating) {
        return;
      }
      setGeolocating(true);

      try {
        const {
          coords: { latitude, longitude },
        } = await promiseTimeout(
          Geolocation.getCurrentPosition({
            // Doesn't seem to work
            timeout: 20 * 1000,
          }),
          // Includes time to approve permissions
          {
            timeout: 20 * 1000,
            getErr: () => new Error('Timed out'),
          },
        );
        onGeolocate(latitude, longitude);
      } catch (err) {
        let msg = '';
        if (err instanceof GeolocationPositionError) {
          msg = err.code === GeolocationPositionError.PERMISSION_DENIED
            ? 'Geolocation request was denied. To fix this, please enable location permissions for the app and try again.'
            : 'Location temporarily unavailable.';
        } else if (err instanceof Error && err.message) {
          msg = err.message;
        } else {
          ErrorLogger.warn(
            err instanceof Error
              ? getErr(err, { ctx: 'GeolocateButton' })
              : getErr('Geolocation error', { ctx: 'GeolocateButton', err }),
          );
        }

        showModal({
          title: 'Failed to get location',
          msg,
        });
      }
      setGeolocating(false);
    }, [geolocating, onGeolocate]),
  );
}
