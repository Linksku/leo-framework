const MAX_URLS = 10;

export const URL_REGEX_STR = '\\bhttps?:\\/\\/(?:[\\w\\u00A1-\\uFFFF-]{0,63}\\.)+[a-z\\u00A1-\\uFFFF]{2,}(?:[#/?](?:\\S*[^\\s!.?])?)?';

const COMMON_TLDS = [
  'com',
  'net',
  'org',
  'info',
  'edu',
  'gov',
  'jp',
  'de',
  'uk',
];

export const URL_DOMAIN_REGEX_STR = `\\b(?:\\w{0,63}\\.)+(?:${COMMON_TLDS.join('|')})\\b`;

export const URL_OPTIONAL_PROTOCOL_REGEX_STR = '\\b(?:\\w{0,63}\\.)+\\w{2,3}[#/?](?:\\S*[^\\s!.?])?\\b';

export const URL_REGEX = new RegExp(URL_REGEX_STR, 'i');

export const URL_REGEX_GLOBAL = new RegExp(URL_REGEX_STR, 'gi');

const URL_OPTIONAL_PROTOCOL_REGEX = new RegExp(
  `(?:${URL_REGEX_STR})|(?:${URL_DOMAIN_REGEX_STR})|(?:${URL_OPTIONAL_PROTOCOL_REGEX_STR})`,
  'gi',
);

export default function getUrlsIndices(
  str: string,
  optionalProtocol?: boolean,
): [number, number][] {
  const regex = optionalProtocol ? URL_OPTIONAL_PROTOCOL_REGEX : URL_REGEX_GLOBAL;
  const indices = [] as [number, number][];

  let match = regex.exec(str);
  while (match && indices.length < MAX_URLS) {
    indices.push([match.index, match.index + match[0].length]);
    match = regex.exec(str);
  }
  // Regex.exec makes the RegExp object stateful.
  regex.lastIndex = 0;

  return indices;
}
