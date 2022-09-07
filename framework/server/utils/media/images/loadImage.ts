import { promises as fs } from 'fs';
import sharp from 'sharp';

export default async function loadImage(path: string) {
  const file = await fs.open(path);
  const stream = file.createReadStream();
  return stream.pipe(sharp());
}
