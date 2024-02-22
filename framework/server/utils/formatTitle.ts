const SPACES = /\s\s+/g;

export default function formatTitle(title: string) {
  return title
    .replaceAll(SPACES, ' ')
    .trim();
}
