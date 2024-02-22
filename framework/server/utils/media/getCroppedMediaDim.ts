export default function getCroppedMediaDim({
  height,
  width,
  maxDim,
  minRatio = 1,
  maxRatio = 1,
}: {
  height: number,
  width: number,
  maxDim: number,
  minRatio?: number,
  maxRatio?: number,
}) {
  if (maxRatio < 1) {
    maxRatio = 1 / maxRatio;
  }
  if (minRatio > 1) {
    minRatio = 1 / minRatio;
  }
  let newHeight = height;
  let newWidth = width;

  // Aspect ratio.
  if (newWidth / newHeight > maxRatio) {
    newWidth = newHeight * maxRatio;
  }
  if (newWidth / newHeight < minRatio) {
    newHeight = newWidth / minRatio;
  }

  // Size.
  if (newHeight > maxDim && newWidth > maxDim) {
    if (newHeight > newWidth) {
      newWidth /= newHeight / maxDim;
      newHeight = maxDim;
    } else {
      newHeight /= newWidth / maxDim;
      newWidth = maxDim;
    }
  } else if (newHeight > maxDim) {
    newWidth *= maxDim / newHeight;
    newHeight = maxDim;
  } else if (newWidth > maxDim) {
    newHeight *= maxDim / newWidth;
    newWidth = maxDim;
  }

  if (newHeight === newWidth) {
    newHeight = Math.round(newHeight);
    newWidth = newHeight;
  } else if (newHeight > newWidth) {
    newHeight = Math.floor(newHeight);
    newWidth = Math.ceil(newWidth);
  } else {
    newHeight = Math.ceil(newHeight);
    newWidth = Math.floor(newWidth);
  }

  return { newHeight, newWidth };
}
