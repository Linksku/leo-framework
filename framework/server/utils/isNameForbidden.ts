import tokenizeString from 'utils/nlp/tokenizeString';
import { forbiddenSubStrs, allowedForbiddenSubStrs, forbiddenWords } from 'consts/unsafeWords';

// Names that should never be allowed.
export default function isNameForbidden(name: string) {
  let filteredName = name.toLowerCase();
  for (const subStr of allowedForbiddenSubStrs) {
    filteredName = filteredName.replaceAll(subStr, '');
  }
  for (const subStr of forbiddenSubStrs) {
    if (filteredName.includes(subStr)) {
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
