export default function getUrlsIndices(str: string): [number, number][] {
  // Regex.exec is stateful.
  const urlRegex = /\bhttps?:\/\/(?![_-])(?:[\w\u00A1-\uFFFF-]{0,63}[^_-]\.)+[a-z\u00A1-\uFFFF]{2,}(?:[#/?]\S*[^\s!.?])?/gi;
  const indices = [] as [number, number][];
  while (true) {
    const match = urlRegex.exec(str);
    if (!match) {
      break;
    }
    indices.push([match.index, match.index + match[0].length]);
  }
  return indices;
}
