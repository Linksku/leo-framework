export default function formatTsquery(name: string, isPhrase = false) {
  const words = name.split(/[\s-_!&()|]+/).filter(Boolean);
  if (isPhrase) {
    return words
      .map((w, idx) => (idx === words.length - 1 ? `${w}:*` : w))
      .join(' <-> ');
  }
  return words
    .map(w => `${w}:*`)
    .join(' & ');
}
