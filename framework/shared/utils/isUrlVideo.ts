export const YOUTUBE_REGEX = /^https?:\/\/(?:[^/]+\.)?(?:youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=)|youtu\.be\/)([^#&?/]{10,12})/i;

export const GFYCAT_REGEX = /^https?:\/\/(?:[^/]+\.)?gfycat\.com\/(\w+)/i;

export const REDDIT_VIDEO_REGEX = /^https?:\/\/v\.redd\.it\/.+/i;

export const VIDEO_REGEX = /\.(mp4|mov|webm|flv|mkv|avi|wmv)($|\?|#)/i;

// Note: ensure all domains can be handled by <Video />
export default function isUrlVideo(url: string): boolean {
  if (!url) {
    return false;
  }
  return YOUTUBE_REGEX.test(url)
    || GFYCAT_REGEX.test(url)
    || REDDIT_VIDEO_REGEX.test(url)
    || VIDEO_REGEX.test(url)
    || url.endsWith('.gifv');
}
