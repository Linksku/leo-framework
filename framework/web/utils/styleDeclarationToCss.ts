const STYLE_REGEX = /([\da-z]|(?=[A-Z]))([A-Z])/g;

const memo = new Map<string, string>();

export default function styleDeclarationToCss(
  style: string,
): string {
  if (!memo.has(style)) {
    memo.set(style, style.replace(STYLE_REGEX, '$1-$2').toLowerCase());
  }
  return memo.get(style) as string;
}
