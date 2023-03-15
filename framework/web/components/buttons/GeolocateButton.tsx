import LocationSvg from 'fa5/svg/location-regular.svg';
import { Geolocation } from '@capacitor/geolocation';

import { API_TIMEOUT } from 'settings';

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
          } = await Geolocation.getCurrentPosition({
            timeout: API_TIMEOUT,
          });
          onGeolocate(latitude, longitude);
        } catch {
          showAlert({
            title: 'Failed to get location.',
          });
        }
      }}
      className={styles.svg}
      role="button"
      tabIndex={-1}
    />
  );
}
