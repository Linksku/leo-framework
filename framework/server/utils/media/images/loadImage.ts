import { promises as fs } from 'fs';
import sharp from 'sharp';

// todo: mid/mid use streams to use less memory
// example: https://github.com/firebase/functions-samples/blob/main/image-sharp/functions/index.js
export default async function loadImage(path: string) {
  const body = await fs.readFile(path);
  return sharp(body);
}
