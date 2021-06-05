import sharp from 'sharp';

import uploadToSpaces from 'lib/uploadToSpaces';

type Opts = {
  maxRatio?: number,
  maxDim?: number,
  quality?: number,
};

export default async function uploadImage(img: sharp.Sharp, outPath: string, {
  quality = 90,
}: Opts = {}): Promise<string> {
  const file = await img
    .withMetadata()
    .jpeg({ quality })
    .toBuffer();
  return uploadToSpaces({
    file,
    outPath,
    contentType: 'image/jpeg',
  });
}
