import LocationSvg from 'boxicons/svg/regular/bx-current-location.svg';
import { Geolocation } from '@capacitor/geolocation';

import { HTTP_TIMEOUT } from 'settings';

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
            timeout: HTTP_TIMEOUT,
          });
          onGeolocate(latitude, longitude);
        } catch {
          showAlert({
            title: 'Failed to get location.',
          });
        }
      }}
      className={styles.btn}
      role="button"
      tabIndex={-1}
    />
  );
}
