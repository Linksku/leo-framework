type Props = {
  height: number,
  width: number,
  orientation?: number,
  maxDim: number,
  maxRatio?: number,
};

export default function getCroppedMediaDim({
  height,
  width,
  maxDim,
  maxRatio = 1,
}: Props) {
  if (maxRatio < 1) {
    maxRatio = 1 / maxRatio;
  }
  let newHeight = height;
  let newWidth = width;

  // Aspect ratio.
  if (newWidth / newHeight > maxRatio) {
    newWidth = Math.round(newHeight * maxRatio);
  }
  if (newHeight / newWidth > maxRatio) {
    newHeight = Math.round(newWidth * maxRatio);
  }

  // Size.
  if (newHeight > maxDim && newWidth > maxDim) {
    if (newHeight > newWidth) {
      newWidth = Math.round(newWidth / (newHeight / maxDim));
      newHeight = maxDim;
    } else {
      newHeight = Math.round(newHeight / (newWidth / maxDim));
      newWidth = maxDim;
    }
  } else if (newHeight > maxDim) {
    newWidth = Math.round(newWidth * (maxDim / newHeight));
    newHeight = maxDim;
  } else if (newWidth > maxDim) {
    newHeight = Math.round(newHeight * (maxDim / newWidth));
    newWidth = maxDim;
  }

  return { newHeight, newWidth };
}
