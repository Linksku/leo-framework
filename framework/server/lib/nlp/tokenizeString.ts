export default function tokenizeString(str: string): string[] {
  let words = str.trim().replace(/\s\s+/g, ' ').split(' ');
  words = words.map(w => w
    .replace(/^[()*,./:;=^_`{}~-]/g, '')
    .replace(/[()*,./:;=^_`{}~-]$/g, ''));
  words = words.filter(Boolean);
  return words;
}
