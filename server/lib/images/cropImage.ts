import type { FitEnum } from 'sharp';
import sharp from 'sharp';

import getNewMediaSize from 'lib/getNewMediaSize';

export default async function cropImage(img: sharp.Sharp, {
  maxDim,
  maxRatio = 1,
  fit = 'cover',
}: {
  maxDim: number,
  maxRatio?: number,
  fit?: keyof FitEnum,
}) {
  const { height, width } = await img.metadata();
  if (!height || !width) {
    throw new Error('Invalid image.');
  }
  const { newHeight, newWidth } = getNewMediaSize({
    height,
    width,
    maxDim,
    maxRatio,
  });

  return {
    img: img.resize({
      height: newHeight,
      width: newWidth,
      fit,
    }),
    height: newHeight,
    width: newWidth,
  };
}
