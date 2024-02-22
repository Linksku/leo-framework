import LocationSvg from 'svgs/fa5/location-regular.svg';
import { Geolocation } from '@capacitor/geolocation';

import promiseTimeout from 'utils/promiseTimeout';

import styles from './GeolocateButton.scss';

type Props = {
  onGeolocate: ((lat: number, lng: number) => void),
  color?: string,
};

export default function GeolocateButton({
  onGeolocate,
  color,
}: Props) {
  const showAlert = useShowAlert();

  return (
    <LocationSvg
      onClick={async () => {
        try {
          const {
            coords: { latitude, longitude },
          } = await promiseTimeout(
            Geolocation.getCurrentPosition({
              // Doesn't seem to work
              timeout: 5000,
            }),
            5000,
            new Error('Timed out'),
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

          showAlert({
            title: 'Failed to get location',
            msg,
          });
        }
      }}
      className={styles.svg}
      style={{ color }}
      role="button"
      tabIndex={0}
    />
  );
}
