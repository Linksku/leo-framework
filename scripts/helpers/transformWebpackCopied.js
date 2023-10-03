import { ASSETS_URL } from '../../framework/shared/settings.js';

export default function transformWebpackCopied(content, absoluteFrom) {
  if (!['html', 'css', 'js', 'cjs', 'json', 'txt'].includes(absoluteFrom.replace(/^.+\./, ''))) {
    return content;
  }
  return content
    .toString()
    .replaceAll('%APP_NAME%', process.env.APP_NAME)
    .replaceAll('%APP_NAME_LOWER%', process.env.APP_NAME_LOWER)
    .replaceAll('%BASE_PATH%', process.env.BASE_PATH)
    .replaceAll('%ASSETS_URL%', ASSETS_URL);
}
