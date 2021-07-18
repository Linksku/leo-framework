module.exports = function transformWebpackCopied(content, absoluteFrom) {
  if (!['html', 'css', 'js', 'json', 'txt'].includes(absoluteFrom.replace(/^.+\./, ''))) {
    return content;
  }
  return content
    .toString()
    .replace(/%APP_NAME%/g, process.env.APP_NAME)
    .replace(/%APP_NAME_LOWER%/g, process.env.APP_NAME_LOWER)
    .replace(/%BASE_PATH%/g, process.env.BASE_PATH);
};