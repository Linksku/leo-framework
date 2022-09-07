export default function lcFirst(str: string) {
  if (!str) {
    return str;
  }
  return str[0].toLowerCase() + str.slice(1);
}
