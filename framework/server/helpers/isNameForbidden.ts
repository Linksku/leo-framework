import tokenizeString from 'utils/nlp/tokenizeString';
import { forbiddenSubStrs, forbiddenWords } from 'consts/unsafeWords';

// Names that should never be allowed.
export default function isNameForbidden(name: string | string[]) {
  const words = typeof name === 'string'
    ? tokenizeString(name)
    : name;

  for (const w of words) {
    if (forbiddenWords.has(w)) {
      return true;
    }
    for (const subStr of forbiddenSubStrs) {
      if (w.includes(subStr)) {
        return true;
      }
    }
  }

  return false;
}
