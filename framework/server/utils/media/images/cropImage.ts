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
  const { height, width, orientation } = await img.metadata();
  // Sharp doesn't use EXIF orientation https://sharp.pixelplumbing.com/api-input#metadata
  const isRotated90Deg = orientation && orientation >= 5;
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
      : img
        .resize({
          height: newHeight,
          width: newWidth,
          fit,
        })
        .withMetadata(),
    height: isRotated90Deg ? newWidth : newHeight,
    width: isRotated90Deg ? newHeight : newWidth,
  };
}
