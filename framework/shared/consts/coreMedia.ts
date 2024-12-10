export const IMG_MEDIA_TYPES = {
  'image/avif': 'avif',
  // Bmp not supported by default: https://github.com/lovell/sharp/issues/543
  // 'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const VIDEO_MEDIA_TYPES = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-flv': 'flv',
  'video/x-matroska': 'mkv',
  'video/x-msvideo': 'avi',
  'video/x-ms-wmv': 'wmv',
};

export const ACCEPTABLE_MEDIA_TYPES = {
  ...IMG_MEDIA_TYPES,
  ...VIDEO_MEDIA_TYPES,
};
