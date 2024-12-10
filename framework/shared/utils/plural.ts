export default function plural(
  word: string,
  pluralOrCount: Nullish<number> | string,
  count?: Nullish<number>,
): string {
  count = typeof pluralOrCount === 'string' ? count : pluralOrCount;

  if (typeof pluralOrCount === 'string') {
    return count === 1 ? word : pluralOrCount;
  }
  return word + (count === 1 ? '' : 's');
}
