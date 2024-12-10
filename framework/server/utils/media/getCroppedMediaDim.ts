export default function getCroppedMediaDim({
  height,
  width,
  minHeight,
  minWidth,
  maxHeight,
  maxWidth,
  minRatio = 1,
  maxRatio = 1,
}: {
  height: number,
  width: number,
  minHeight: number,
  minWidth: number,
  maxHeight: number,
  maxWidth: number,
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
  const ratio = width / height;
  if (ratio > maxRatio) {
    // Wide
    newWidth = newHeight * maxRatio;
  } else if (ratio < minRatio) {
    // Tall
    newHeight = newWidth / minRatio;
  }

  // Size.
  if (newHeight > maxHeight) {
    newWidth = Math.max(
      minWidth,
      newWidth * maxHeight / newHeight,
    );
    newHeight = maxHeight;
  }
  if (newWidth > maxWidth) {
    newHeight = Math.max(
      minHeight,
      newHeight * maxWidth / newWidth,
    );
    newWidth = maxWidth;
  }

  newHeight = Math.round(newHeight);
  newWidth = Math.round(newWidth);

  // Fix float rounding
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
  }
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
  }
  const newRatio = newWidth / newHeight;
  if (newRatio > maxRatio) {
    newWidth--;
  } else if (newRatio < minRatio) {
    newHeight--;
  }

  return { newHeight, newWidth };
}
