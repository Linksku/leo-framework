import { promises as fs } from 'fs';
import sharp from 'sharp';

export default async function loadImage(inPath: string) {
  const body = await fs.readFile(inPath);
  return sharp(body);
}
