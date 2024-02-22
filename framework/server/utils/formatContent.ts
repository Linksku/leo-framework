const NEWLINES = /\n\s+\n/g;

export default function formatContent(content: string) {
  return content
    .replaceAll(NEWLINES, '\n\n')
    .trim();
}
