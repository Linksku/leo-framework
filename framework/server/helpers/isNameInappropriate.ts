import tokenizeString from 'utils/nlp/tokenizeString';
import inappropriateWordsRaw from 'consts/inappropriateWords.txt';
import isNameForbidden from 'helpers/isNameForbidden';

// todo: mid/hard handle common substitutions, e.g. sex -> s3x
const inappropriateWords = new Set(inappropriateWordsRaw
  .trim()
  .split('\n')
  .filter(line => line && !line.includes(' ')));

// Names that may be allowed for adult content.
export default function isNameInappropriate(name: string | string[]) {
  if (typeof name === 'string') {
    name = tokenizeString(name);
  }

  for (const w of name) {
    if (inappropriateWords.has(w)) {
      return true;
    }
  }

  if (isNameForbidden(name)) {
    return true;
  }

  return false;
}