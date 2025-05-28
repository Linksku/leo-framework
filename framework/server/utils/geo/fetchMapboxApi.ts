import fetchJson from 'utils/fetchJson';

export default async function fetchMapboxApi(
  service: string,
  endpoint: string,
  params: string,
) {
  const res = await fetchJson(
    `https://api.mapbox.com/${service}/v5/${endpoint}/${encodeURIComponent(params)}.json?access_token=${process.env.MAPBOX_TOKEN}`,
  );
  if (res.status >= 400) {
    throw new Error(`fetchMapboxApi(${service}/${endpoint}): got ${res.status} status.`);
  }
  return res.data;
}
