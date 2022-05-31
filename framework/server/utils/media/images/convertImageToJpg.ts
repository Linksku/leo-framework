import sharp from 'sharp';

type Opts = {
  maxRatio?: number,
  maxDim?: number,
  quality?: number,
};

export default async function convertImageToJpg(img: sharp.Sharp, {
  quality = 90,
}: Opts = {}): Promise<Buffer> {
  return img
    .withMetadata()
    .flatten({
      background: { r: 255, g: 255, b: 255 },
    })
    .jpeg({ quality })
    .toBuffer();
}
