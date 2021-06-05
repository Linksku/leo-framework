import sharp from 'sharp';

export default async function loadRemoteImage(url: string) {
  const res = await fetch(url);
  const body = await res.arrayBuffer();
  return sharp(Buffer.from(body));
}
