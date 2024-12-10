export default function truncateStr(
  str: string,
  maxLength: number,
  ellipsis = '…',
): string {
  if (str.length <= maxLength) {
    return str;
  }

  str = str.slice(0, maxLength - ellipsis.length);
  const lastIdx = Math.max(
    str.lastIndexOf(' '),
    str.lastIndexOf('\n'),
  );
  if (lastIdx > (maxLength - ellipsis.length) * 0.9) {
    str = str.slice(0, lastIdx);
  }
  return str + ellipsis;
}
