import tokenizeString from 'lib/nlp/tokenizeString';

// https://www.ofcom.org.uk/__data/assets/pdf_file/0022/91624/OfcomOffensiveLanguage.pdf
const subStrs = [
  'chink',
  'fagg',
  'golliwog',
  'jailbait',
  'negro',
  'nigg',
  'retard',
];

const words = new Set([
  'coon',
  'cunt',
  'fag',
  'nig',
  'paki',
  'twat',
  'wog',
]);

// Names that should never be allowed.
export default function isNameForbidden(name: string | string[]) {
  if (typeof name === 'string') {
    name = tokenizeString(name);
  }

  for (const w of name) {
    if (words.has(w)) {
      return true;
    }
    for (const subStr of subStrs) {
      if (w.includes(subStr)) {
        return true;
      }
    }
  }

  return false;
}
