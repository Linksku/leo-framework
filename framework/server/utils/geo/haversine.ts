import { RADIUS_OF_EARTH_IN_KM, DEG_TO_RAD, KM_TO_MILES } from 'consts/geo';

export default function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  isMiles = false,
): number {
  const dLat = DEG_TO_RAD * (lat2 - lat1);
  const dLng = DEG_TO_RAD * (lng2 - lng1);

  lat1 *= DEG_TO_RAD;
  lat2 *= DEG_TO_RAD;

  // Haversine Formula
  const a = (Math.sin(dLat / 2) ** 2)
    + ((Math.sin(dLng / 2) ** 2) * Math.cos(lat1) * Math.cos(lat2));
  const c = 2 * Math.asin(Math.sqrt(a));
  const kmDistance = RADIUS_OF_EARTH_IN_KM * c;

  return isMiles
    ? kmDistance * KM_TO_MILES
    : kmDistance;
}
