import type { FitEnum } from 'sharp';
import sharp from 'sharp';

import getCroppedMediaDim from 'utils/media/getCroppedMediaDim';

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
  const { newHeight, newWidth } = getCroppedMediaDim({
    height,
    width,
    maxDim,
    maxRatio,
  });

  return {
    img: height === newHeight && width === newWidth
      ? img
      : img.resize({
        height: newHeight,
        width: newWidth,
        fit,
      }),
    height: newHeight,
    width: newWidth,
  };
}
