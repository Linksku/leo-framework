const RADIUS_OF_EARTH_IN_KM = 6371;

function toRadian(angle: number) {
  return (Math.PI / 180) * angle;
}

function distance(a: number, b: number) {
  return (Math.PI / 180) * (a - b);
}

export default function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  isMiles = false,
) {
  const dLat = distance(lat2, lat1);
  const dlng = distance(lng2, lng1);

  lat1 = toRadian(lat1);
  lat2 = toRadian(lat2);

  // Haversine Formula
  const a = (Math.sin(dLat / 2) ** 2)
    + ((Math.sin(dlng / 2) ** 2) * Math.cos(lat1) * Math.cos(lat2));
  const c = 2 * Math.asin(Math.sqrt(a));

  let finalDistance = RADIUS_OF_EARTH_IN_KM * c;

  if (isMiles) {
    finalDistance /= 1.60934;
  }

  return finalDistance;
}
