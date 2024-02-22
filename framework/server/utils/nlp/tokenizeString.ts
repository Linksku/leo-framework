const WHITESPACE = /\s\s+/g;
const STARTING_SPECIAL_CHARS = /^[()*,./:;=^_`{}~-]/g;
const ENDING_SPECIAL_CHARS = /[()*,./:;=^_`{}~-]$/g;

export default function tokenizeString(str: string): string[] {
  return str
    .replaceAll(WHITESPACE, ' ')
    .trim()
    .split(' ')
    .map(
      w => w
        .replaceAll(STARTING_SPECIAL_CHARS, '')
        .replaceAll(ENDING_SPECIAL_CHARS, ''),
    )
    .filter(Boolean);
}
