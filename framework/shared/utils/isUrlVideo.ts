export const gfycatRegex = /^https?:\/\/([a-z]+\.)?gfycat\.com\/(\w+)/i;

export const redditVideoRegex = /^https?:\/\/v\.redd\.it\/.+/i;

export const videoRegex = /\.(mp4|mov|webm|flv|mkv|avi|wmv)($|\?|#)/i;

export default function isUrlVideo(url: string): boolean {
  return gfycatRegex.test(url) || redditVideoRegex.test(url) || videoRegex.test(url);
}
