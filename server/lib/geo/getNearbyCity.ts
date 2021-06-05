import haversine from 'lib/geo/haversine';
import fetchMapboxApi from 'lib/geo/fetchMapboxApi';

const MAX_CITY_DIM_KM = 30;

async function getMapboxCity(lat: number, lng: number) {
  let mapboxData;
  try {
    mapboxData = await fetchMapboxApi('geocoding', 'mapbox.places', `${lng},${lat}`);
  } catch {}
  if (!mapboxData?.length) {
    return null;
  }

  const cityFeature = mapboxData.find((d: any) => d.place_type?.includes('place'));
  const countryFeature = mapboxData.find((d: any) => d.place_type?.includes('country'));
  if (!cityFeature || !countryFeature) {
    return null;
  }
  // eslint-disable-next-line camelcase
  if (!cityFeature.text || !cityFeature.center || !countryFeature.properties?.short_code) {
    throw new HandledError('Unexpected Mapbox format', 500);
  }

  const cityData = {
    name: cityFeature.text,
    countryCode: countryFeature.properties.short_code.toUpperCase(),
    lat: cityFeature.center[1],
    lng: cityFeature.center[0],
  };

  const cityId = await City.transaction(async () => {
    const existingCity = await City.query()
      .where({
        name: cityData.name,
        countryCode: cityData.countryCode,
      })
      .whereRaw(
        // 50km
        'st_distance_sphere(location, st_pointfromtext(\'point(? ?)\', 4326)) < 500000',
        [cityData.lat, cityData.lng],
      )
      .limit(1)
      .first();
    if (existingCity) {
      return existingCity.id;
    }

    return City.insert(cityData);
  });
  return City.findOne('id', cityId);
}

export default async function getNearbyCity(lat: number, lng: number): Promise<City | null> {
  // todo: low/mid make this faster by having a distance limit
  const city = await City.query()
    .orderByRaw(
      'st_distance_sphere(location, st_pointfromtext(\'point(? ?)\', 4326))',
      [lat, lng],
    )
    .limit(1)
    .first();
  if (city && haversine(lat, lng, city.lat, city.lng) <= MAX_CITY_DIM_KM) {
    return city;
  }

  const mapboxCity = await getMapboxCity(lat, lng);
  if (mapboxCity && haversine(lat, lng, mapboxCity.lat, mapboxCity.lng) <= MAX_CITY_DIM_KM) {
    return mapboxCity;
  }

  return null;
}
