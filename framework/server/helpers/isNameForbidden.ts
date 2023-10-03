import tokenizeString from 'utils/nlp/tokenizeString';
import { forbiddenSubStrs, forbiddenWords } from 'consts/unsafeWords';

// Names that should never be allowed.
export default function isNameForbidden(name: string) {
  for (const subStr of forbiddenSubStrs) {
    if (name.includes(subStr)) {
      return true;
    }
  }

  const words = tokenizeString(name);
  for (const w of words) {
    if (forbiddenWords.has(w)) {
      return true;
    }
  }

  return false;
}
