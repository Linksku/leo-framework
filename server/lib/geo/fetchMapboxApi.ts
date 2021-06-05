export default async function fetchMapboxApi(
  service: string,
  endpoint: string,
  params: string,
) {
  const res = await fetch(`https://api.mapbox.com/${service}/v5/${endpoint}/${params}.json?access_token=${process.env.MAPBOX_TOKEN}`);
  const data = await res.json();
  return data.features;
}
