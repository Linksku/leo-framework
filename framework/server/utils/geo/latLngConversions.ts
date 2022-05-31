import { degToRad } from 'utils/math/radians';

const KM_PER_LAT = 110.574;
const KM_PER_LNG_MAX = 111.32;

export function latToKm(deg: number) {
  return deg * KM_PER_LAT;
}

export function lngToKm(deg: number) {
  return Math.cos(degToRad(deg)) * KM_PER_LNG_MAX;
}

export function kmToLat(km: number) {
  return km / KM_PER_LAT;
}

export function kmToLng(km: number, centerLat: number) {
  return km / KM_PER_LNG_MAX / Math.cos(degToRad(centerLat));
}
