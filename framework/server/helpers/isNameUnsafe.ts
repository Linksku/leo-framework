import tokenizeString from 'utils/nlp/tokenizeString';
import unsafeWordsRaw from 'consts/unsafeWords.txt';
import { unsafeSubStrs } from 'consts/unsafeWords';

// todo: mid/hard handle common substitutions, e.g. sex -> s3x
const unsafeWords = new Set(
  unsafeWordsRaw
    .trim()
    .split('\n')
    .filter(line => line && !line.includes(' ')),
);

// Names that may be allowed for adult content.
export default function isNameUnsafe(name: string | string[]) {
  const words = typeof name === 'string'
    ? tokenizeString(name)
    : name;

  for (const w of words) {
    if (unsafeWords.has(w)) {
      return true;
    }
    for (const subStr of unsafeSubStrs) {
      if (w.includes(subStr)) {
        return true;
      }
    }
  }

  return false;
}
