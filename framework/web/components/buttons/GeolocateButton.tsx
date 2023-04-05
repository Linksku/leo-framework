import LocationSvg from 'fa5/svg/location-regular.svg';
import { Geolocation } from '@capacitor/geolocation';

import promiseTimeout from 'utils/promiseTimeout';

import styles from './GeolocateButtonStyles.scss';

type Props = {
  onGeolocate: ((lat: number, lng: number) => void),
};

export default function GeolocateButton({
  onGeolocate,
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
          showAlert({
            title: 'Failed to get location',
            msg: err instanceof Error ? err.message : '',
          });
        }
      }}
      className={styles.svg}
      role="button"
      tabIndex={-1}
    />
  );
}
