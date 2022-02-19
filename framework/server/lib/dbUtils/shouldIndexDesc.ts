export default function shouldIndexDesc(name: string) {
  return /^(num|sum|net|avg|min|max)/i.test(name)
    || /(id|time|score|count)$/i.test(name);
}
