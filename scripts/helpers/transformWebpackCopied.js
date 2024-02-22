import { APP_NAME, APP_NAME_LOWER } from '../../framework/shared/config/config.js';
import { ASSETS_URL, BASE_PATH } from '../../framework/shared/consts/server.js';

export default function transformWebpackCopied(content, absoluteFrom) {
  if (!['html', 'css', 'js', 'cjs', 'json', 'txt']
    .includes(absoluteFrom.replace(/^.+\./, ''))) {
    return content;
  }
  return content
    .toString()
    .replaceAll('%APP_NAME%', APP_NAME)
    .replaceAll('%APP_NAME_LOWER%', APP_NAME_LOWER)
    .replaceAll('%BASE_PATH%', BASE_PATH)
    .replaceAll('%ASSETS_URL%', ASSETS_URL);
}
